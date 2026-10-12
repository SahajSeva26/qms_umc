import { RequestContext } from '../utils/contextBuilder';

// infrastructure/events/event-publisher.interface.ts
export interface IEventProvider {
    // entity: the subject of the event (e.g. 'camp', 'invoice', 'lead')
    // event:  what happened (e.g. 'create', 'update') → combined into DetailType `${entity}.${event}`
    // data:   payload serialized into the EventBridge Detail
    // ctx:    request context — used only for request-scoped logging, never serialized
    publish(entity: string, event: string, data: object, ctx?: RequestContext): Promise<void>;
}
