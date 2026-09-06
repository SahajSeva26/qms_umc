// Inventory-consumable Routes
import express from 'express';
import { InventoryConsumableController } from './inventory-consumable.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import {
    CreateInventoryConsumablePayloadSchema,
    InventoryConsumableReportQuerySchema,
    SearchInventoryConsumableQuerySchema,
    UpdateInventoryConsumablePayloadSchema,
} from './inventory-consumable.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../../shared/middlewares/authorizeMiddleware';
import { INVENTORY_CONSUMABLE_PERMISSIONS } from './inventory-consumable.constants';

export const InventoryConsumableRouter = express.Router();

InventoryConsumableRouter.use(AuthMiddleware);

// inventory consumable stock report
registry.registerPath({
    method: 'get',
    path: '/inventory-consumables/report',
    tags: ['INVENTORY CONSUMABLE'],
    summary: 'Inventory consumable report — lot counts, active stock quantity, expiry',
    description:
        'Consumable stock snapshot: summary.consumableLots (total lots) and summary.' +
        'warehouseConsumableQuantity + consumables.warehouseQuantity (both = SUM of quantity over ' +
        'active lots only — no location filter, same value), consumables.expiredByDate (lots with ' +
        'expiryDate < now, date-based not status-based), and consumables.byStatus (counts per status ' +
        '— active/expired — every status appears, defaulting to 0). Requires inventory-consumable:manage.',
    request: {
        query: InventoryConsumableReportQuerySchema,
    },
    responses: {
        200: { description: 'Inventory consumable report generated successfully' },
        403: { description: 'Forbidden — inventory-consumable:manage permission required' },
    },
});

// get consumable lot
registry.registerPath({
    method: 'get',
    path: '/inventory-consumables/{id}',
    tags: ['INVENTORY CONSUMABLE'],
    summary: 'Get consumable lot (by id)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'Consumable lot fetched successfully' },
        404: { description: 'Consumable lot not found' },
    },
});

// search consumable lots
registry.registerPath({
    method: 'get',
    path: '/inventory-consumables',
    tags: ['INVENTORY CONSUMABLE'],
    summary: 'Search consumable lots',
    request: {
        query: SearchInventoryConsumableQuerySchema,
    },
    responses: {
        200: { description: 'Consumable lots fetched successfully' },
    },
});

// create consumable lot
registry.registerPath({
    method: 'post',
    path: '/inventory-consumables',
    tags: ['INVENTORY CONSUMABLE'],
    summary: 'Create consumable lot (stock of a catalog item)',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: CreateInventoryConsumablePayloadSchema,
                },
            },
        },
    },
    responses: {
        201: { description: 'Consumable lot created successfully' },
        400: { description: 'Validation error' },
        404: { description: 'The referenced inventory item does not exist' },
        409: { description: 'A consumable lot with this item and batch already exists' },
    },
});

// update consumable lot
registry.registerPath({
    method: 'put',
    path: '/inventory-consumables/{id}',
    tags: ['INVENTORY CONSUMABLE'],
    summary: 'Update consumable lot (item ref is immutable)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: UpdateInventoryConsumablePayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Consumable lot updated successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Consumable lot not found' },
    },
});

// =======================================================================
// ================= EXPORT INVENTORY CONSUMABLE ROUTES ==================
// =======================================================================
// reads are open to any authenticated user; only writes (create/update) are permission-guarded.
// the report is manager-only; it MUST be registered before '/:id' so 'report' is not read as an id.
InventoryConsumableRouter.get(
    '/report',
    AuthorizeMiddleware([INVENTORY_CONSUMABLE_PERMISSIONS.MANAGE.code]),
    InventoryConsumableController.report,
);
InventoryConsumableRouter.get('/:id', InventoryConsumableController.get);
InventoryConsumableRouter.get('/', InventoryConsumableController.search);

InventoryConsumableRouter.post(
    '/',
    AuthorizeMiddleware([INVENTORY_CONSUMABLE_PERMISSIONS.MANAGE.code]),
    InventoryConsumableController.create,
);
InventoryConsumableRouter.put(
    '/:id',
    AuthorizeMiddleware([INVENTORY_CONSUMABLE_PERMISSIONS.MANAGE.code]),
    InventoryConsumableController.update,
);
