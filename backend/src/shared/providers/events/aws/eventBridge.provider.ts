import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { IEventProvider } from '../../../types/event.types';
import { IQmsEvent } from '../../../types/event.types';
import ENV from '../../../config/app.config';
import { StatusCodes } from 'http-status-codes';
import { throwAppError } from '../../../utils/error';
import { logger } from '../../../utils/logger';

export const AWS_EVENT_BRIDGE = 'aws-event-bridge';

export class EventBridgeProvider implements IEventProvider {
    private readonly client: EventBridgeClient;
    private readonly eventBusName: string;
    private readonly source: string;

    constructor() {
        this.client = new EventBridgeClient({
            region: ENV.Providers.AWS.Region,
            credentials: {
                accessKeyId: ENV.Providers.AWS.AccessKeyId,
                secretAccessKey: ENV.Providers.AWS.SecretAccessKey,
            },
        });
        this.eventBusName = ENV.Providers.AWS_EventBridge.EventBusName;
        this.source = ENV.Providers.AWS_EventBridge.Source;
    }

    async publish(event: IQmsEvent): Promise<void> {
        // Prefer the request-scoped logger (carries request id / trace context) when the caller
        // passed ctx; fall back to the global logger for events raised outside a request.
        const log = event.ctx?.logger ?? logger;
        try {
            const command = new PutEventsCommand({
                Entries: [
                    {
                        EventBusName: this.eventBusName,
                        Source: this.source,
                        DetailType: event.type,
                        Detail: JSON.stringify(event.data ?? {}),
                    },
                ],
            });

            const result = await this.client.send(command);

            // PutEvents returns HTTP 200 even when an entry is rejected — inspect FailedEntryCount
            // and surface the per-entry error, otherwise the failure is silent.
            if (result.FailedEntryCount && result.FailedEntryCount > 0) {
                const failed = result.Entries?.find((entry) => entry.ErrorCode);
                log.error(
                    { eventType: event.type, errorCode: failed?.ErrorCode, errorMessage: failed?.ErrorMessage },
                    'EventBridge rejected the event',
                );
                return throwAppError('Failed to publish the event', StatusCodes.INTERNAL_SERVER_ERROR);
            }

            log.info(
                { eventType: event.type, eventId: result.Entries?.[0]?.EventId },
                'Event published to EventBridge',
            );
        } catch (error: any) {
            log.error({ err: error, eventType: event?.type }, error?.message || 'Failed to publish the event');
            return throwAppError('Failed to publish the event', StatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
}
