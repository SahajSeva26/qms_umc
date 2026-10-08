import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { IEventProvider } from '../../../types/event.types';
import { IQmsEvent } from '../../../types/event.types';
import ENV from '../../../config/app.config';

export const AWS_EVENT_BRIDGE = 'aws-event-bridge';

export class EventBridgeProvider implements IEventProvider {
    private readonly client: EventBridgeClient;

    constructor() {
        this.client = new EventBridgeClient({
            region: ENV.Providers.AWS.Region,
            credentials: {
                accessKeyId: ENV.Providers.AWS.AccessKeyId,
                secretAccessKey: ENV.Providers.AWS.SecretAccessKey,
            },
        });
    }

    publish(event: IQmsEvent): Promise<void> {
        // TODO: Implement AWS EventBridge publishing logic
        throw new Error('Method not implemented.');
    }
}
