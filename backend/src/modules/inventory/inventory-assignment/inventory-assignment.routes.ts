// Inventory-assignment Routes
import express from 'express';
import { InventoryAssignmentController } from './inventory-assignment.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import {
    CreateInventoryAssignmentPayloadSchema,
    DirectAssignmentPayloadSchema,
    InventoryAssignmentReportQuerySchema,
    SearchInventoryAssignmentQuerySchema,
    UpdateInventoryAssignmentPayloadSchema,
} from './inventory-assignment.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../../shared/middlewares/authorizeMiddleware';
import { INVENTORY_ASSIGNMENT_PERMISSIONS } from './inventory-assignment.constants';

export const InventoryAssignmentRouter = express.Router();

InventoryAssignmentRouter.use(AuthMiddleware);

// inventory assignment field-officer roster report
registry.registerPath({
    method: 'get',
    path: '/inventory-assignments/report',
    tags: ['INVENTORY ASSIGNMENT'],
    summary: 'Inventory field-officer roster report — per-FO holdings and pending requests',
    description:
        'Field-officer roster (all ACTIVE field officers, including those with zero holdings): ' +
        'summary.totalFieldOfficers, summary.fieldOfficersHoldingInventory, and fieldOfficers[] each ' +
        'with role/name/code + devicesHeld/consumableUnitsHeld/awaitingApproval/awaitingReceipt, ' +
        'sorted by name. Requires inventory-assignment:manage.',
    request: {
        query: InventoryAssignmentReportQuerySchema,
    },
    responses: {
        200: { description: 'Inventory assignment report generated successfully' },
        403: { description: 'Forbidden — inventory-assignment:manage permission required' },
    },
});

// get assignment (a single holding row) by id
registry.registerPath({
    method: 'get',
    path: '/inventory-assignments/{id}',
    tags: ['INVENTORY ASSIGNMENT'],
    summary: 'Get an assignment row (by id)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'Assignment fetched successfully' },
        404: { description: 'Assignment not found' },
    },
});

// search assignment rows
registry.registerPath({
    method: 'get',
    path: '/inventory-assignments',
    tags: ['INVENTORY ASSIGNMENT'],
    summary: 'Search assignment rows (by assignee, inventoryType or inventory item held)',
    request: {
        query: SearchInventoryAssignmentQuerySchema,
    },
    responses: {
        200: { description: 'Assignments fetched successfully' },
    },
});

// create a holding row (assign one item to a field officer)
registry.registerPath({
    method: 'post',
    path: '/inventory-assignments',
    tags: ['INVENTORY ASSIGNMENT'],
    summary: 'Assign one inventory item (device/consumable) to a field officer',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: CreateInventoryAssignmentPayloadSchema,
                },
            },
        },
    },
    responses: {
        201: { description: 'Assignment created successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Assignee or referenced inventory item not found' },
        409: { description: 'This item is already assigned to this assignee' },
    },
});

// direct assignment — manager pushes stock straight to a field officer (bypasses the request flow)
registry.registerPath({
    method: 'post',
    path: '/inventory-assignments/direct-assignment/{fo}',
    tags: ['INVENTORY ASSIGNMENT'],
    summary: 'Directly assign devices/consumables to a field officer (manager only, no request)',
    description:
        'Manager pushes stock straight to the FO, bypassing the refill request/approve/receive cycle. ' +
        'Devices must be available warehouse units; consumables are pulled FEFO from the warehouse. ' +
        'Warehouse stock is decremented, the FO holding updated, and a DIRECT ledger row logged — all ' +
        'in one transaction. Requires inventory-assignment:manage.',
    parameters: [{ name: 'fo', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: DirectAssignmentPayloadSchema,
                },
            },
        },
    },
    responses: {
        201: { description: 'Inventory directly assigned successfully' },
        400: { description: 'Validation error / item is not a consumable' },
        404: { description: 'Field officer or referenced item/device not found' },
        409: { description: 'Device is not available / insufficient consumable stock' },
    },
});

// update a holding row's quantity
registry.registerPath({
    method: 'put',
    path: '/inventory-assignments/{id}',
    tags: ['INVENTORY ASSIGNMENT'],
    summary: 'Update a holding row quantity (identity is immutable)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
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
        404: { description: 'Assignment not found' },
    },
});

// remove a holding row
registry.registerPath({
    method: 'delete',
    path: '/inventory-assignments/{id}',
    tags: ['INVENTORY ASSIGNMENT'],
    summary: 'Remove a holding row (assignee no longer holds this item)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'Assignment removed successfully' },
        404: { description: 'Assignment not found' },
    },
});

// =======================================================================
// ================ EXPORT INVENTORY ASSIGNMENT ROUTES ===================
// =======================================================================
// reads are open to any authenticated user; only writes (create/update/remove) are permission-guarded.
InventoryAssignmentRouter.get(
    '/report',
    AuthorizeMiddleware([INVENTORY_ASSIGNMENT_PERMISSIONS.MANAGE.code]),
    InventoryAssignmentController.report,
);
InventoryAssignmentRouter.get('/:id', InventoryAssignmentController.get);
InventoryAssignmentRouter.get('/', InventoryAssignmentController.search);

InventoryAssignmentRouter.post(
    '/',
    AuthorizeMiddleware([INVENTORY_ASSIGNMENT_PERMISSIONS.MANAGE.code]),
    InventoryAssignmentController.create,
);

// direct assignment — manager only; :fo is the target field officer
InventoryAssignmentRouter.post(
    '/direct-assignment/:fo',
    AuthorizeMiddleware([INVENTORY_ASSIGNMENT_PERMISSIONS.MANAGE.code]),
    InventoryAssignmentController.directAssign,
);

InventoryAssignmentRouter.put(
    '/:id',
    AuthorizeMiddleware([INVENTORY_ASSIGNMENT_PERMISSIONS.MANAGE.code]),
    InventoryAssignmentController.update,
);

InventoryAssignmentRouter.delete(
    '/:id',
    AuthorizeMiddleware([INVENTORY_ASSIGNMENT_PERMISSIONS.MANAGE.code]),
    InventoryAssignmentController.remove,
);
