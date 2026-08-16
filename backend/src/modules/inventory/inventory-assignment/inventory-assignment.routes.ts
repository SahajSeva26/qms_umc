// Inventory-assignment Routes
import express from 'express';
import { InventoryAssignmentController } from './inventory-assignment.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import {
    SearchInventoryAssignmentQuerySchema,
    UpdateInventoryAssignmentPayloadSchema,
} from './inventory-assignment.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../../shared/middlewares/authorizeMiddleware';
import { INVENTORY_ASSIGNMENT_PERMISSIONS } from './inventory-assignment.constants';

export const InventoryAssignmentRouter = express.Router();

InventoryAssignmentRouter.use(AuthMiddleware);

// get assignment
registry.registerPath({
    method: 'get',
    path: '/inventory-assignments/{id}',
    tags: ['INVENTORY ASSIGNMENT'],
    summary: 'Get assignment (by id)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'Assignment fetched successfully' },
        404: { description: 'Assignment not found' },
    },
});

// search assignments
registry.registerPath({
    method: 'get',
    path: '/inventory-assignments',
    tags: ['INVENTORY ASSIGNMENT'],
    summary: 'Search assignments (by assignee, device or consumable held)',
    request: {
        query: SearchInventoryAssignmentQuerySchema,
    },
    responses: {
        200: { description: 'Assignments fetched successfully' },
    },
});

// upsert assignment (keyed on assignee) — creates one if the assignee holds none, else edits it
registry.registerPath({
    method: 'put',
    path: '/inventory-assignments/{assignee}',
    tags: ['INVENTORY ASSIGNMENT'],
    summary: 'Set an assignee\'s holdings (creates the assignment if none exists; supplied lists replace existing)',
    parameters: [{ name: 'assignee', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: UpdateInventoryAssignmentPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Assignment updated successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Assignee or a referenced inventory item not found' },
    },
});

// =======================================================================
// ================ EXPORT INVENTORY ASSIGNMENT ROUTES ===================
// =======================================================================
// reads are open to any authenticated user; only writes (create/update) are permission-guarded.
InventoryAssignmentRouter.get('/:id', InventoryAssignmentController.get);
InventoryAssignmentRouter.get('/', InventoryAssignmentController.search);

InventoryAssignmentRouter.put(
    '/:assignee',
    AuthorizeMiddleware([INVENTORY_ASSIGNMENT_PERMISSIONS.MANAGE.code]),
    InventoryAssignmentController.update,
);
