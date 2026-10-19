import { IQueueProvider } from '../../types/queue.types';
import { SQS, SqsProvider } from './aws/sqs.provider';

class QueueManager {
    private readonly providers: Map<string, IQueueProvider> = new Map();

    constructor() {
        this.providers.set(SQS, new SqsProvider());
    }

    get(name: string): IQueueProvider {
        const provider = this.providers.get(name);
        if (!provider) {
            throw new Error(`Queue provider ${name} not found`);
        }
        return provider;
    }
}

export const queueManager = new QueueManager();
