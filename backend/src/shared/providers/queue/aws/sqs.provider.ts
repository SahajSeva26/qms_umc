import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import ENV from '../../../config/app.config';
import { logger } from '../../../utils/logger';
import { IQueueMessage, IQueueProvider } from '../../../types/queue.types';

export const SQS = 'sqs';

export class SqsProvider implements IQueueProvider {
    private readonly client: SQSClient;

    constructor() {
        this.client = new SQSClient({
            region: ENV.Providers.AWS.Region,
            credentials: {
                accessKeyId: ENV.Providers.AWS.AccessKeyId,
                secretAccessKey: ENV.Providers.AWS.SecretAccessKey,
            },
        });
    }

    async receive(queueUrl: string): Promise<IQueueMessage[]> {
        const response = await this.client.send(
            new ReceiveMessageCommand({
                QueueUrl: queueUrl,
                MaxNumberOfMessages: 10,
                // Long poll — wait up to 20s for messages instead of returning empty immediately.
                WaitTimeSeconds: 20,
                // Hide a received message from other consumers while it is being processed.
                VisibilityTimeout: 120,
            }),
        );

        // Drop malformed entries (no body / no receipt handle — can't process or ack them).
        return (response.Messages ?? [])
            .filter((message) => message.Body && message.ReceiptHandle)
            .map((message) => ({
                id: message.MessageId,
                body: message.Body as string,
                receiptHandle: message.ReceiptHandle as string,
            }));
    }

    async delete(queueUrl: string, receiptHandle: string): Promise<void> {
        await this.client.send(
            new DeleteMessageCommand({
                QueueUrl: queueUrl,
                ReceiptHandle: receiptHandle,
            }),
        );
        logger.debug({ queueUrl }, 'Deleted message from queue');
    }
}
