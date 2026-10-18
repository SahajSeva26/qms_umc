// Notification worker — standalone process. Long-polls the notification SQS queue, consumes
// events published to EventBridge and routed into the queue, then for each event: renders the
// per-recipient/per-channel template, persists a Notification row, and sends via the channel
// provider. Runs as the SYSTEM user (no HTTP request → it builds its own context).
//
// Run separately from the API: `npm run worker:notification`.

// MUST be first: registers the Zod OpenAPI extension before any module validator is imported below.
import '../shared/config/swagger/swagger.registry';

import fs from 'fs';
import path from 'path';
import ENV from '../shared/config/app.config';
import connectDB from '../shared/config/connectDB';
import { logger } from '../shared/utils/logger';
import { queueManager } from '../shared/providers/queue/queue';
import { SQS } from '../shared/providers/queue/aws/sqs.provider';
import { loadTemplate } from '../shared/utils/templateLoader';
import { getByPath } from '../shared/utils/object';
import { HandlebarsHelper } from '../shared/helpers/handlebar';
import { messagingManager } from '../shared/providers/messaging/messaging';
import { IMessage } from '../shared/types/message.types';
import { TemplateConfig } from '../shared/types/template.types';
import { buildContext, RequestContext } from '../shared/utils/contextBuilder';
import { PERMISSIONS } from '../shared/env/permissions';
import { TenantModel } from '../modules/access-management/tenant/tenant.model';
import { UserModel } from '../modules/user/user.model';
import { RoleModel } from '../modules/access-management/role/role.model';
import { NotificationService } from '../modules/notification/notification.service';
import { ICreateNotificationPayload } from '../modules/notification/notification.validators';

const queueUrl = ENV.Providers.AWS_SQS.NotificationQueueUrl;
const queue = queueManager.get(SQS);

// 'camp.create' -> modules/notification/events/camp/create.ts
const EVENTS_DIR = path.join(__dirname, '../modules/notification/events');
const TEMPLATES_DIR = path.join(__dirname, '../shared/templates');

// System-user context the worker runs under (no HTTP request). ipAddress is pinned to 127.0.0.1
// so system-originated actions are distinguishable from user-originated ones.
export const buildWorkerContext = async (): Promise<RequestContext> => {
    const tenant = await TenantModel.findOne({ code: ENV.App.SystemTenantCode });
    const user = await UserModel.findOne({ email: ENV.App.SystemUserEmail });
    // No populate('type'): the worker's import graph doesn't register the RoleType model, and the
    // system ctx doesn't need it (permissions are pinned to system:manage; create/where ignore it).
    const role = await RoleModel.findOne({ code: 'system' });

    if (!tenant || !user || !role) {
        throw new Error('System tenant/user/role not found — boot the app once so it seeds them, then start the worker.');
    }

    const req: any = {
        socket: { remoteAddress: '127.0.0.1' },
        user: {
            _id: user._id.toString(),
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: role._id.toString(),
            tenant: tenant._id.toString(),
        },
        role,
        tenant,
        permissions: [PERMISSIONS.SYSTEM.MANAGE.code],
    };

    buildContext(req, {}, () => {});
    return req.context;
};

// Render a .hbs file; returns null if the file is missing.
const renderTemplateFile = (filePath: string, data: unknown): string | null => {
    if (!fs.existsSync(filePath)) {
        return null;
    }
    const source = fs.readFileSync(filePath, 'utf8');
    return HandlebarsHelper.render(source, data);
};

// Turn a consumed event into notifications: load config, resolve recipients, render templates,
// persist a row per recipient/channel, and send via the matching provider.
export async function handleEvent(event: any, ctx: RequestContext): Promise<void> {
    // EventBridge envelope: detail-type carries the event code, detail carries the payload.
    const code: string | undefined = event?.['detail-type'];
    if (!code) {
        logger.warn({ event }, 'Consumed event has no detail-type — skipping');
        return;
    }

    const configPath = path.join(EVENTS_DIR, code.replace(/\./g, '/'));
    const config = await loadTemplate<TemplateConfig>(configPath);

    if (!config) {
        // No config for this code — ack and drop rather than retry forever.
        logger.warn({ code }, 'No template config for event code — skipping');
        return;
    }

    // Config addresses the payload as `data.*` (e.g. 'data.fo.email'), so expose detail under `data`.
    const payload = { data: event.detail ?? {} };
    const subject = config.subject ? HandlebarsHelper.render(config.subject, payload) : undefined;

    // Source entity: type is the code prefix ('camp.create' -> 'camp'), id from data.<type>._id.
    const entityType = code.split('.')[0] ?? code;
    const entityId = getByPath(payload, `data.${entityType}._id`);
    const entity = entityId ? { id: String(entityId), type: entityType, event: code } : undefined;

    const toPersist: ICreateNotificationPayload[] = [];

    for (const recipient of config.recepients) {
        // 'data.fo.email' -> address is the last segment, recipient id is the object's _id,
        // template folder is the middle segment ('fo').
        const parts = recipient.source.split('.');
        const addressKey = parts[parts.length - 1] ?? '';
        const folder = parts[1] ?? '';
        const recipientObj = getByPath(payload, parts.slice(0, -1).join('.')) as Record<string, any> | undefined;

        const to = recipientObj?.[addressKey];
        const recipientId = recipientObj?._id;

        if (typeof to !== 'string' || !to) {
            logger.warn({ code, source: recipient.source }, 'Recipient source did not resolve — skipping');
            continue;
        }
        if (!folder) {
            logger.warn({ code, source: recipient.source }, 'Could not derive template folder from source — skipping');
            continue;
        }

        for (const channel of recipient.channels) {
            const templatePath = path.join(TEMPLATES_DIR, config.template, folder, `${channel}.hbs`);
            const body = renderTemplateFile(templatePath, payload);
            if (body === null) {
                logger.warn({ code, channel, templatePath }, 'Template missing — skipping');
                continue;
            }

            // Queue the row for a single bulk insert (needs the recipient User id; without it we
            // still send but don't persist).
            if (recipientId) {
                const createPayload: ICreateNotificationPayload = {
                    recipient: String(recipientId),
                    event: code,
                    channel,
                    body,
                };
                if (subject) {
                    createPayload.subject = subject;
                }
                if (entity) {
                    createPayload.entity = entity;
                }
                toPersist.push(createPayload);
            } else {
                logger.warn({ code, source: recipient.source }, 'No recipient _id in payload — not persisting');
            }

            const message: IMessage = { to, body };
            if (subject) {
                message.subject = subject;
            }

            try {
                await messagingManager.get(channel).send(message);
            } catch (error) {
                logger.error({ err: error, code, channel, to }, 'Failed to send notification message');
            }
        }
    }

    // Persist all rows for this event in a single round-trip.
    if (toPersist.length) {
        try {
            await NotificationService.bulkCreate(toPersist, ctx);
        } catch (error) {
            logger.error({ err: error, code }, 'Failed to persist notifications');
        }
    }
}

async function pollMessages(ctx: RequestContext): Promise<void> {
    if (!queueUrl) {
        logger.error('AWS_SQS_NOTIFICATION_QUEUE_URL is not configured — worker cannot start');
        process.exitCode = 1;
        return;
    }

    logger.info({ queueUrl }, 'Notification worker started');

    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            const messages = await queue.receive(queueUrl);

            for (const message of messages) {
                try {
                    const event = JSON.parse(message.body);
                    await handleEvent(event, ctx);

                    // Ack only after a successful handle — a throw leaves it for redelivery.
                    await queue.delete(queueUrl, message.receiptHandle);
                } catch (error) {
                    logger.error({ err: error, messageId: message.id }, 'Failed to consume notification event');
                }
            }
        } catch (error) {
            logger.error({ err: error }, 'Queue polling failed');
            // Avoid a tight retry loop during an outage.
            await new Promise((resolve) => setTimeout(resolve, 3000));
        }
    }
}

// Only start when run as the entry point, so the module can be imported (e.g. tests) without
// connecting to the DB or starting the consume loop.
if (require.main === module) {
    (async () => {
        await connectDB();
        const ctx = await buildWorkerContext();
        await pollMessages(ctx);
    })().catch((error) => {
        logger.error({ err: error }, 'Notification worker terminated');
        process.exitCode = 1;
    });
}
