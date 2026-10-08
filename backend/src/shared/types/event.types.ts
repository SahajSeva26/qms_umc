// infrastructure/events/event.types.ts
export interface IQmsEvent {
    id: string;
    type: string;
    source: string;
    occurredAt: Date;
    data: any;
}

// infrastructure/events/event-publisher.interface.ts
export interface IEventProvider {
    publish(event: IQmsEvent): Promise<void>;
}
