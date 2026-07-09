import express from 'express';
import { TenantController } from './tenant.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import {
    CreateTenantPayloadSchema,
    SearchTenantQuerySchema,
    UpdateTenantPayloadSchema,
} from './tenant.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../../shared/middlewares/authorizeMiddleware';
import { PERMISSIONS } from '../../../shared/env/permissions';

export const TenantRouter = express.Router();

TenantRouter.use(AuthMiddleware);

// get tenant
registry.registerPath({
    method: 'get',
    path: '/tenants/{id}',
    tags: ['TENANT'],
    summary: 'Get tenant',
    parameters: [
        {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
        },
    ],
    responses: {
        200: { description: 'Tenant fetched successfully' },
        400: { description: 'Tenant fetch failed' },
    },
});

// search tenants
registry.registerPath({
    method: 'get',
    path: '/tenants',
    tags: ['TENANT'],
    summary: 'Search tenants',
    request: {
        query: SearchTenantQuerySchema,
    },
    responses: {
        200: { description: 'Tenants fetched successfully' },
        400: { description: 'Tenant search failed' },
    },
});

// create tenant
registry.registerPath({
    method: 'post',
    path: '/tenants',
    tags: ['TENANT'],
    summary: 'Create tenant',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: CreateTenantPayloadSchema,
                },
            },
        },
    },
    responses: {
        201: { description: 'Tenant created successfully' },
        400: { description: 'Tenant creation failed' },
        409: { description: 'Tenant already exists' },
    },
});

// update tenant
registry.registerPath({
    method: 'put',
    path: '/tenants/{id}',
    tags: ['TENANT'],
    summary: 'Update tenant',
    parameters: [
        {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
        },
    ],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: UpdateTenantPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Tenant updated successfully' },
        400: { description: 'Tenant update failed' },
        404: { description: 'Tenant not found' },
    },
});

// ==========================================================================
// ================= EXPORTED ROUTES ========================================
// ==========================================================================
TenantRouter.get(
    '/:id',
    AuthorizeMiddleware([
        PERMISSIONS.TENANT.GET.code,
        PERMISSIONS.TENANT.MANAGE.code,
    ]),
    TenantController.get,
);
TenantRouter.get(
    '/',
    AuthorizeMiddleware([
        PERMISSIONS.TENANT.SEARCH.code,
        PERMISSIONS.TENANT.MANAGE.code,
    ]),
    TenantController.search,
);
TenantRouter.post(
    '/',
    AuthorizeMiddleware([
        PERMISSIONS.TENANT.CREATE.code,
        PERMISSIONS.TENANT.MANAGE.code,
    ]),
    TenantController.create,
);
TenantRouter.put(
    '/:id',
    AuthorizeMiddleware([
        PERMISSIONS.TENANT.UPDATE.code,
        PERMISSIONS.TENANT.MANAGE.code,
    ]),
    TenantController.update,
);
