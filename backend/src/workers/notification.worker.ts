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
import { NOTIFICATION_CHANNELS, NOTIFICATION_STATUS } from '../modules/notification/notification.constants';

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

// Event-level context shared by every delivery of one consumed event.
type EventContext = {
    code: string;
    template: string;
    payload: unknown;
    subject?: string | undefined;
    entity?: { id: string; type: string; event: string } | undefined;
};

// Deliver one channel to one recipient and return the row to persist with its final send status.
// in-app has no provider (persisting the row is the delivery). Never throws — a failed send is a
// 'failed' row.
async function deliver(
    evt: EventContext,
    folder: string,
    to: string,
    recipientId: unknown,
    channel: ICreateNotificationPayload['channel'],
): Promise<ICreateNotificationPayload | null> {
    const templatePath = path.join(TEMPLATES_DIR, evt.template, folder, `${channel}.hbs`);
    const body = renderTemplateFile(templatePath, evt.payload);
    if (body === null) {
        logger.warn({ code: evt.code, channel, templatePath }, 'Template missing — skipping');
        return null;
    }
    if (!recipientId) {
        logger.warn({ code: evt.code, channel }, 'No recipient _id — skipping');
        return null;
    }

    const row: ICreateNotificationPayload = { recipient: String(recipientId), event: evt.code, channel, body };
    if (evt.subject) {
        row.subject = evt.subject;
    }
    if (evt.entity) {
        row.entity = evt.entity;
    }

    if (channel === NOTIFICATION_CHANNELS.IN_APP) {
        return { ...row, status: NOTIFICATION_STATUS.SENT, sentAt: new Date() };
    }

    const message: IMessage = { to, body };
    if (evt.subject) {
        message.subject = evt.subject;
    }

    try {
        await messagingManager.get(channel).send(message);
        return { ...row, status: NOTIFICATION_STATUS.SENT, sentAt: new Date(), attempts: 1 };
    } catch (error: any) {
        logger.error({ err: error, code: evt.code, channel, to }, 'Failed to send notification message');
        return { ...row, status: NOTIFICATION_STATUS.FAILED, error: String(error?.message ?? error), attempts: 1 };
    }
}

// Load the event's config, resolve recipients, fan out delivery in parallel, persist in one write.
export async function handleEvent(event: any, ctx: RequestContext): Promise<void> {
    const code: string | undefined = event?.['detail-type'];
    if (!code) {
        logger.warn({ event }, 'Consumed event has no detail-type — skipping');
        return;
    }

    const config = await loadTemplate<TemplateConfig>(path.join(EVENTS_DIR, code.replace(/\./g, '/')));
    if (!config) {
        logger.warn({ code }, 'No template config for event code — skipping');
        return;
    }

    // Configs address the payload as `data.*`, so expose the event detail under `data`.
    const payload = { data: event.detail ?? {} };
    const subject = config.subject ? HandlebarsHelper.render(config.subject, payload) : undefined;

    // The entity id is at data.<type>._id when the payload wraps the entity, or data._id when flat.
    const entityType = code.split('.')[0] ?? code;
    const entityId = getByPath(payload, `data.${entityType}._id`) ?? getByPath(payload, 'data._id');
    const entity = entityId ? { id: String(entityId), type: entityType, event: code } : undefined;

    const evt: EventContext = { code, template: config.template, payload, subject, entity };

    // Fan out every recipient × channel — standalone process, so the sends run in parallel.
    const jobs: Promise<ICreateNotificationPayload | null>[] = [];
    for (const recipient of config.recepients) {
        // 'data.fo.user.email' → address is the last segment, id is the object's _id, folder is 'fo'.
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
            logger.warn({ code, source: recipient.source }, 'Could not derive template folder — skipping');
            continue;
        }

        for (const channel of recipient.channels) {
            jobs.push(deliver(evt, folder, to, recipientId, channel));
        }
    }

    const toPersist = (await Promise.all(jobs)).filter(Boolean) as ICreateNotificationPayload[];
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
