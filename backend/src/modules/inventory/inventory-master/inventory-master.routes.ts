// Inventory-master Routes
import express from 'express';
import { InventoryMasterController } from './inventory-master.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import {
    CreateInventoryMasterPayloadSchema,
    SearchInventoryMasterQuerySchema,
    UpdateInventoryMasterPayloadSchema,
} from './inventory-master.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../../shared/middlewares/authorizeMiddleware';
import { INVENTORY_MASTER_PERMISSIONS } from './inventory-master.constants';

export const InventoryMasterRouter = express.Router();

InventoryMasterRouter.use(AuthMiddleware);

// get inventory item
registry.registerPath({
    method: 'get',
    path: '/inventory-masters/{id}',
    tags: ['INVENTORY MASTER'],
    summary: 'Get inventory item (by id or code)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'Inventory item fetched successfully' },
        404: { description: 'Inventory item not found' },
    },
});

// search inventory items
registry.registerPath({
    method: 'get',
    path: '/inventory-masters',
    tags: ['INVENTORY MASTER'],
    summary: 'Search inventory items',
    request: {
        query: SearchInventoryMasterQuerySchema,
    },
    responses: {
        200: { description: 'Inventory items fetched successfully' },
    },
});

// create inventory item
registry.registerPath({
    method: 'post',
    path: '/inventory-masters',
    tags: ['INVENTORY MASTER'],
    summary: 'Create inventory item (global catalog record)',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: CreateInventoryMasterPayloadSchema,
                },
            },
        },
    },
    responses: {
        201: { description: 'Inventory item created successfully' },
        400: { description: 'Validation error' },
        409: { description: 'An inventory item with this code already exists' },
    },
});

// update inventory item
registry.registerPath({
    method: 'put',
    path: '/inventory-masters/{id}',
    tags: ['INVENTORY MASTER'],
    summary: 'Update inventory item (code is immutable)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: UpdateInventoryMasterPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Inventory item updated successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Inventory item not found' },
    },
});

// =======================================================================
// =================== EXPORT INVENTORY MASTER ROUTES ====================
// =======================================================================
// reads are open to any authenticated user — the catalog is a global reference registry.
// only writes (create/update) are permission-guarded.
InventoryMasterRouter.get('/:id', InventoryMasterController.get);
InventoryMasterRouter.get('/', InventoryMasterController.search);

InventoryMasterRouter.post(
    '/',
    AuthorizeMiddleware([INVENTORY_MASTER_PERMISSIONS.MANAGE.code]),
    InventoryMasterController.create,
);
InventoryMasterRouter.put(
    '/:id',
    AuthorizeMiddleware([INVENTORY_MASTER_PERMISSIONS.MANAGE.code]),
    InventoryMasterController.update,
);
