import { eventManager } from '../providers/events/events';
import { RequestContext } from '../utils/contextBuilder';
import { logger } from '../utils/logger';

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

        try {
            await eventManager.get(provider).publish(entity, event, data, ctx);
        } catch (error: any) {
            log.error({ err: error, entity, event }, 'Failed to publish event');
        }
    }
}

export const eventProcessor = new EventProcessor();
