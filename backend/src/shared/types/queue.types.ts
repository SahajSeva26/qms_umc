// Queue consumer contract — the consume side of the event system
// (EventBridge publishes via IEventProvider; a queue is drained via IQueueProvider).
// A provider only knows HOW to pull from / acknowledge a queue. What a message
// means and how it's processed lives in the worker/service, not here.

export interface IQueueMessage {
    // Provider message id (SQS MessageId), when available.
    id?: string | undefined;
    // Raw message body as delivered by the queue (JSON string for EventBridge→SQS).
    body: string;
    // Handle used to delete the message after it has been processed.
    receiptHandle: string;
}

export interface IQueueProvider {
    // Long-poll the queue and return a batch of messages (possibly empty).
    receive(queueUrl: string): Promise<IQueueMessage[]>;
    // Acknowledge a message so the queue stops redelivering it.
    delete(queueUrl: string, receiptHandle: string): Promise<void>;
}
