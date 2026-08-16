// Inventory-request Routes
import express from 'express';
import { InventoryRequestController } from './inventory-request.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import {
    CreateInventoryRequestPayloadSchema,
    MoveStagePayloadSchema,
    SearchInventoryRequestQuerySchema,
    UpdateInventoryRequestPayloadSchema,
} from './inventory-request.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../../shared/middlewares/authorizeMiddleware';
import { INVENTORY_REQUEST_PERMISSIONS } from './inventory-request.constants';

export const InventoryRequestRouter = express.Router();

InventoryRequestRouter.use(AuthMiddleware);

// get request
registry.registerPath({
    method: 'get',
    path: '/inventory-requests/{id}',
    tags: ['INVENTORY REQUEST'],
    summary: 'Get request (by id)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'Request fetched successfully' },
        404: { description: 'Request not found' },
    },
});

// search requests
registry.registerPath({
    method: 'get',
    path: '/inventory-requests',
    tags: ['INVENTORY REQUEST'],
    summary: 'Search requests (by type, status, requester, processor or item held)',
    request: {
        query: SearchInventoryRequestQuerySchema,
    },
    responses: {
        200: { description: 'Requests fetched successfully' },
    },
});

// create request
registry.registerPath({
    method: 'post',
    path: '/inventory-requests',
    tags: ['INVENTORY REQUEST'],
    summary: 'Raise a refill/return request (requester is the authenticated actor)',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: CreateInventoryRequestPayloadSchema,
                },
            },
        },
    },
    responses: {
        201: { description: 'Request created successfully' },
        400: { description: 'Validation error' },
        404: { description: 'A referenced device or consumable was not found' },
    },
});

// update request (edit lines while still requested)
registry.registerPath({
    method: 'put',
    path: '/inventory-requests/{id}',
    tags: ['INVENTORY REQUEST'],
    summary: 'Edit a request\'s lines (only while it is still in the requested stage)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: UpdateInventoryRequestPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Request updated successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Request not found' },
        409: { description: 'Request is no longer in the requested stage' },
    },
});

// move request stage
registry.registerPath({
    method: 'patch',
    path: '/inventory-requests/{id}/stage',
    tags: ['INVENTORY REQUEST'],
    summary: 'Move a request to a new stage (records reason in stage history)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: MoveStagePayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Request stage updated successfully' },
        400: { description: 'Invalid stage transition or validation error' },
        404: { description: 'Request not found' },
    },
});

// =======================================================================
// ================= EXPORT INVENTORY REQUEST ROUTES =====================
// =======================================================================
// each route accepts its own CRUD permission OR manage (the domain superset). progressing the
// request's stage (approve/reject/receive) is a manage-only action.
InventoryRequestRouter.get(
    '/:id',
    AuthorizeMiddleware([INVENTORY_REQUEST_PERMISSIONS.GET.code, INVENTORY_REQUEST_PERMISSIONS.MANAGE.code], 'OR'),
    InventoryRequestController.get,
);
InventoryRequestRouter.get(
    '/',
    AuthorizeMiddleware([INVENTORY_REQUEST_PERMISSIONS.SEARCH.code, INVENTORY_REQUEST_PERMISSIONS.MANAGE.code], 'OR'),
    InventoryRequestController.search,
);

InventoryRequestRouter.post(
    '/',
    AuthorizeMiddleware([INVENTORY_REQUEST_PERMISSIONS.CREATE.code, INVENTORY_REQUEST_PERMISSIONS.MANAGE.code], 'OR'),
    InventoryRequestController.create,
);
InventoryRequestRouter.put(
    '/:id',
    AuthorizeMiddleware([INVENTORY_REQUEST_PERMISSIONS.UPDATE.code, INVENTORY_REQUEST_PERMISSIONS.MANAGE.code], 'OR'),
    InventoryRequestController.update,
);
// both a requester (update) and a manager (manage) may hit this — the service decides which
// transitions each is allowed: a manager does any valid move, a requester can only cancel their own
// request (and, for a refill, confirm receipt).
InventoryRequestRouter.patch(
    '/:id/stage',
    AuthorizeMiddleware([INVENTORY_REQUEST_PERMISSIONS.UPDATE.code, INVENTORY_REQUEST_PERMISSIONS.MANAGE.code], 'OR'),
    InventoryRequestController.moveStage,
);
