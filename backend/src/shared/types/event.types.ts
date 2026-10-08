import { RequestContext } from '../utils/contextBuilder';

// infrastructure/events/event.types.ts
export interface IQmsEvent {
    type: string;
    data: object;
    // Request context the event was raised in — used for request-scoped logging/tracing.
    // NOT serialized into the EventBridge payload; only event.data is sent.
    ctx?: RequestContext;
}

// infrastructure/events/event-publisher.interface.ts
export interface IEventProvider {
    publish(event: IQmsEvent): Promise<void>;
}
