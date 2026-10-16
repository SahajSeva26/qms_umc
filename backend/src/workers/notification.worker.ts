// Notification worker — standalone process. Long-polls the notification SQS queue and
// consumes events published to EventBridge and routed into the queue.
//
// For now it ONLY consumes: each message is parsed and handed to `handleEvent`, which is
// the seam where notification processing will be added later. Nothing is persisted or sent yet.
//
// Run separately from the API: `npm run worker:notification`.

import fs from 'fs';
import path from 'path';
import ENV from '../shared/config/app.config';
import { logger } from '../shared/utils/logger';
import { queueManager } from '../shared/providers/queue/queue';
import { SQS } from '../shared/providers/queue/aws/sqs.provider';
import { loadTemplate } from '../shared/utils/templateLoader';
import { getByPath } from '../shared/utils/object';
import { HandlebarsHelper } from '../shared/helpers/handlebar';
import { messagingManager } from '../shared/providers/messaging/messaging';
import { IMessage } from '../shared/types/message.types';
import { TemplateConfig } from '../shared/types/template.types';

const queueUrl = ENV.Providers.AWS_SQS.NotificationQueueUrl;
const queue = queueManager.get(SQS);

// Event configs live one per file, keyed by the event code (EventBridge detail-type):
//   'camp.create' -> modules/notification/events/camp/create.ts
const EVENTS_DIR = path.join(__dirname, '../modules/notification/events');
// Handlebars templates: <TEMPLATES_DIR>/<config.template>/<recipientFolder>/<channel>.hbs
const TEMPLATES_DIR = path.join(__dirname, '../shared/templates');

// Recipient folder is derived from the source's middle segment: 'data.fo.email' -> 'fo'.
const recipientFolder = (source: string): string | undefined => {
    const parts = source.split('.');
    return parts.length >= 2 ? parts[1] : undefined;
};

// Read + render a .hbs file; returns null if the file is missing (templates are optional/WIP).
const renderTemplateFile = (filePath: string, data: unknown): string | null => {
    if (!fs.existsSync(filePath)) {
        return null;
    }
    const source = fs.readFileSync(filePath, 'utf8');
    return HandlebarsHelper.render(source, data);
};

// Turn a consumed event into outbound messages: load its config, resolve each recipient from
// the event payload, render the per-channel template, and send via the matching messaging
// provider. Persisting Notification rows is a later step (needs the recipient User id — the
// config currently resolves an email, not a user id).
export async function handleEvent(event: any): Promise<void> {
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

    // The config addresses the event payload as `data.*` (e.g. 'data.fo.email'); EventBridge
    // Detail is the published payload, so expose it under `data`.
    const payload = { data: event.detail ?? {} };
    const subject = config.subject ? HandlebarsHelper.render(config.subject, payload) : undefined;

    for (const recipient of config.recepients) {
        const to = getByPath(payload, recipient.source);
        if (typeof to !== 'string' || !to) {
            logger.warn({ code, source: recipient.source }, 'Recipient source did not resolve — skipping');
            continue;
        }

        const folder = recipientFolder(recipient.source);
        if (!folder) {
            logger.warn({ code, source: recipient.source }, 'Could not derive template folder from source — skipping');
            continue;
        }

        for (const channel of recipient.channels) {
            const templatePath = path.join(TEMPLATES_DIR, config.template, folder, `${channel}.hbs`);
            const body = renderTemplateFile(templatePath, payload);
            if (body === null) {
                logger.warn({ code, channel, templatePath }, 'Template missing — skipping send');
                continue;
            }

            const message: IMessage = { to, body };
            // Subject is consistent across all channels; attach it whenever the config defines one
            // (omit rather than pass undefined, per exactOptionalPropertyTypes).
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
}

async function pollMessages(): Promise<void> {
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
                    await handleEvent(event);

                    // Acknowledge only after a successful handle — a thrown error leaves the
                    // message on the queue for redelivery after the visibility timeout.
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

// Only start polling when run as the entry point (`npm run worker:notification`), so the
// module can be imported (e.g. for tests) without kicking off the consume loop.
if (require.main === module) {
    pollMessages().catch((error) => {
        logger.error({ err: error }, 'Notification worker terminated');
        process.exitCode = 1;
    });
}
