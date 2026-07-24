import { CounterModel, ICounter } from '../../modules/counter/counter.model';
import { LEAD_COUNTER_ENTITY } from '../../modules/crm/lead/lead.constants';
import { PROJECT_COUNTER_ENTITY } from '../../modules/crm/project/project.constants';
import { CAMP_COUNTER_ENTITY } from '../../modules/operations/camp/camp.constants';
import logger from '../utils/logger';
import { throwAppError } from '../utils/error';

// Counters that must exist before the app starts serving traffic. Each consumer
// (lead, and later project/camp/…) atomically increments its counter on create, so
// the counter has to already exist — a bare $inc against a missing doc returns null.
//
// This seed owns the FORMATTING config (prefix/separator/padding). Consumers only
// increment currentValue and render the code; they never re-declare how it looks.
const COUNTERS = [
    {
        entity: LEAD_COUNTER_ENTITY,
        prefix: 'ld',
        separator: '-',
        padding: 6,
        description: 'Sequential code for leads (ld-000001)',
    },
    {
        entity: PROJECT_COUNTER_ENTITY,
        prefix: 'prj',
        separator: '-',
        padding: 6,
        description: 'Sequential code for projects (prj-000001)',
    },
    {
        entity: CAMP_COUNTER_ENTITY,
        prefix: 'camp',
        separator: '-',
        padding: 6,
        description: 'Sequential code for camps (camp-000001)',
    },
];

const seedCounters = async () => {
    const startTime = Date.now();
    logger.info('Seeding counters...');
    try {
        // ensure the collection + indexes exist before any write
        await CounterModel.init();

        // counters are independent of each other — seed them concurrently
        await Promise.all(
            COUNTERS.map(async (counter) => {
                // idempotent — skip if the counter already exists (never reset a live sequence)
                const existing = await CounterModel.findOne({ entity: counter.entity });
                if (existing) return;

                const created = await CounterModel.create(counter);
                logger.debug({ counterId: created.id, entity: created.entity }, 'Counter seeded');
            }),
        );

        logger.info('Counter seeding completed successfully....');
        logger.info(`Counter seeding took ${Date.now() - startTime}ms`);
    } catch (error) {
        logger.error({ err: error }, 'Error seeding counters');
        return throwAppError('Error seeding counters', 500);
    }
};

export default seedCounters;
