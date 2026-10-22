import { IEventProvider } from '../../types/event.types';
import { EventBridgeProvider } from './aws/eventBridge.provider';

class EventManager {
    private readonly providers: Map<string, IEventProvider> = new Map();

    constructor() {
        this.providers.set('aws', new EventBridgeProvider());
    }

    get(name: string) {
        const provider = this.providers.get(name);
        if (!provider) {
            throw new Error(`Event provider ${name} not found`);
        }
        return provider;
    }
}
export const eventManager = new EventManager();
