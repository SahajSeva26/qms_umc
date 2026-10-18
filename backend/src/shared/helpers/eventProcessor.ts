import { eventManager } from '../providers/events/events';
import { RequestContext } from '../utils/contextBuilder';
import { logger } from '../utils/logger';

// Thin wrapper over the event layer. `process` publishes to the chosen event handler
// (default 'aws') only when ctx.processSync is true; otherwise it is a no-op (logged
// and ignored). The same ctx is threaded throughout.
class EventProcessor {
    async process(
        entity: string,
        event: string,
        data: object,
        ctx?: RequestContext,
        provider: string = 'aws',
    ): Promise<void> {
        const log = ctx?.logger ?? logger;

        if (!ctx?.processSync) {
            log.info({ entity, event }, 'processSync is off — skipping event publish');
            return;
        }

        await eventManager.get(provider).publish(entity, event, data, ctx);
    }
}

export const eventProcessor = new EventProcessor();
