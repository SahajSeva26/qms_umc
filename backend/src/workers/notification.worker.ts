// Notification worker — standalone process. Long-polls the notification SQS queue and
// consumes events published to EventBridge and routed into the queue.
//
// For now it ONLY consumes: each message is parsed and handed to `handleEvent`, which is
// the seam where notification processing will be added later. Nothing is persisted or sent yet.
//
// Run separately from the API: `npm run worker:notification`.

import ENV from '../shared/config/app.config';
import { logger } from '../shared/utils/logger';
import { queueManager } from '../shared/providers/queue/queue';
import { SQS } from '../shared/providers/queue/aws/sqs.provider';

const queueUrl = ENV.Providers.AWS_SQS.NotificationQueueUrl;
const queue = queueManager.get(SQS);

// Seam for later: turn a consumed event into notifications and process/send it.
// Deliberately does nothing but log for now — processing is added here.
async function handleEvent(event: any): Promise<void> {
    logger.info('handleEvent called');
    logger.info({ event }, 'Notification event consumed');
    // TODO: process the event (create + dispatch notifications)
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

pollMessages().catch((error) => {
    logger.error({ err: error }, 'Notification worker terminated');
    process.exitCode = 1;
});
