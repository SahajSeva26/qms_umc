// Counter Routes
import express from 'express';
import { CounterController } from './counter.controller';
import { registry } from '../../shared/config/swagger/swagger.registry';
import {
    SearchCounterQuerySchema,
    UpdateCounterPayloadSchema,
} from './counter.validators';
import { AuthMiddleware } from '../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../shared/middlewares/authorizeMiddleware';
import { COUNTER_PERMISSIONS } from './counter.constants';

export const CounterRouter = express.Router();

CounterRouter.use(AuthMiddleware);

// get counter
registry.registerPath({
    method: 'get',
    path: '/counters/{id}',
    tags: ['COUNTER'],
    summary: 'Get counter (by id or entity)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'Counter fetched successfully' },
        404: { description: 'Counter not found' },
    },
});

// search counters
registry.registerPath({
    method: 'get',
    path: '/counters',
    tags: ['COUNTER'],
    summary: 'Search counters',
    request: {
        query: SearchCounterQuerySchema,
    },
    responses: {
        200: { description: 'Counters fetched successfully' },
    },
});

// update counter
registry.registerPath({
    method: 'put',
    path: '/counters/{id}',
    tags: ['COUNTER'],
    summary: 'Update counter (entity and currentValue are immutable via CRUD)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: UpdateCounterPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Counter updated successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Counter not found' },
    },
});

// =======================================================================
// ======================== EXPORT COUNTER ROUTES ========================
// =======================================================================
// reads are open to any authenticated user — counter is a global reference registry.
// only writes (create/update) are permission-guarded.
CounterRouter.get('/:id', CounterController.get);
CounterRouter.get('/', CounterController.search);

CounterRouter.put(
    '/:id',
    AuthorizeMiddleware([COUNTER_PERMISSIONS.MANAGE.code]),
    CounterController.update,
);
