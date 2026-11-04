import express from 'express';
import { TenantController } from './tenant.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import {
    ActivateTenantLogoPayloadSchema,
    BulkTenantOpenApiSchema,
    CreateTenantLogoPayloadSchema,
    CreateTenantPayloadSchema,
    SearchTenantQuerySchema,
    UpdateTenantPayloadSchema,
} from './tenant.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { Authorize } from '../../../shared/middlewares/authorize.middleware';
import { csvUploader } from '../../../shared/middlewares/upload/csvUploader';
import {
    PERMISSIONS,
    SYSTEM_PERMISSIONS,
} from '../../../shared/env/permissions';

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

// bulk create customer clients (CSV upload)
registry.registerPath({
    method: 'post',
    path: '/tenants/bulk',
    tags: ['TENANT'],
    summary: 'Bulk create customer clients from a CSV upload',
    request: {
        body: {
            content: {
                'multipart/form-data': {
                    schema: BulkTenantOpenApiSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Clients created successfully' },
        400: { description: 'Validation error / clients created with errors' },
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

registry.registerPath({
    method: 'get',
    path: '/tenants/me',
    tags: ['TENANT'],
    summary: 'Get current tenant',
    responses: {
        200: { description: 'Tenant fetched successfully' },
        400: { description: 'Tenant fetch failed' },
    },
});

// tenant logo — new upload request (discards the old logo); write-gated like the update routes
registry.registerPath({
    method: 'post',
    path: '/tenants/{id}/logo',
    tags: ['TENANT'],
    summary: 'Create a tenant logo upload intent (discards the previous logo)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: { body: { content: { 'application/json': { schema: CreateTenantLogoPayloadSchema } } } },
    responses: {
        201: { description: 'ok' },
        400: { description: 'Validation error' },
        404: { description: 'Tenant not found' },
    },
});

// tenant logo — activate the uploaded draft logo
registry.registerPath({
    method: 'post',
    path: '/tenants/{id}/logo/activate',
    tags: ['TENANT'],
    summary: 'Activate the uploaded tenant logo',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: { body: { content: { 'application/json': { schema: ActivateTenantLogoPayloadSchema } } } },
    responses: {
        200: { description: 'Tenant logo updated' },
        400: { description: 'Validation error / file does not belong to this tenant' },
        404: { description: 'Tenant not found' },
    },
});

// tenant logo — fetch the active logo
registry.registerPath({
    method: 'get',
    path: '/tenants/{id}/logo',
    tags: ['TENANT'],
    summary: "Get a tenant's active logo",
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'Tenant logo fetched successfully' },
        404: { description: 'Tenant not found' },
    },
});

// ==========================================================================
// ================= EXPORTED ROUTES ========================================
// ==========================================================================

TenantRouter.get('/me', AuthMiddleware, TenantController.getTenantMe);

TenantRouter.get(
    '/:id',
    Authorize.anyPermissions([
        PERMISSIONS.TENANT.GET.code,
        PERMISSIONS.TENANT.MANAGE.code,
    ]),
    TenantController.get,
);
TenantRouter.get(
    '/',
    Authorize.anyPermissions([
        PERMISSIONS.TENANT.SEARCH.code,
        PERMISSIONS.TENANT.MANAGE.code,
    ]),
    TenantController.search,
);
// bulk create — platform-only (same guard as single create); CSV file field name is `file`.
// declared before POST '/' for clarity.
TenantRouter.post(
    '/bulk',
    Authorize.anyPermissions([
        PERMISSIONS.TENANT.MANAGE.code,
        SYSTEM_PERMISSIONS.MANAGE.code,
    ]),
    csvUploader.single('file'),
    TenantController.bulkCreate,
);
TenantRouter.post(
    '/',
    Authorize.anyPermissions([
        // PERMISSIONS.TENANT.CREATE.code,
        PERMISSIONS.TENANT.MANAGE.code,
        SYSTEM_PERMISSIONS.MANAGE.code,
    ]),
    TenantController.create,
);
TenantRouter.put(
    '/:id',
    Authorize.anyPermissions([
        PERMISSIONS.TENANT.UPDATE.code,
        PERMISSIONS.TENANT.MANAGE.code,
    ]),
    TenantController.update,
);

// tenant logo — writes gated like the update routes; read gated like the get route
TenantRouter.post(
    '/:id/logo',
    Authorize.anyPermissions([PERMISSIONS.TENANT.UPDATE.code, PERMISSIONS.TENANT.MANAGE.code]),
    TenantController.createLogo,
);
TenantRouter.post(
    '/:id/logo/activate',
    Authorize.anyPermissions([PERMISSIONS.TENANT.UPDATE.code, PERMISSIONS.TENANT.MANAGE.code]),
    TenantController.activateLogo,
);
TenantRouter.get(
    '/:id/logo',
    Authorize.anyPermissions([PERMISSIONS.TENANT.GET.code, PERMISSIONS.TENANT.MANAGE.code]),
    TenantController.getLogo,
);
