import express from 'express';
import { RoleTypeController } from './roleType.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import {
    CreateRoleTypePayloadSchema,
    SearchRoleTypeQuerySchema,
    UpdateRoleTypePayloadSchema,
} from './roleType.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../../shared/middlewares/authorizeMiddleware';
import { PERMISSIONS } from '../../../shared/env/permissions';
import { TENANT_PERMISSIONS } from '../tenant/tenant.constants';

export const RoleTypeRouter = express.Router();

RoleTypeRouter.use(AuthMiddleware);

// get role type
registry.registerPath({
    method: 'get',
    path: '/role-types/{id}',
    tags: ['ROLE-TYPE'],
    summary: 'Get role type',
    parameters: [
        {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
        },
    ],
    responses: {
        200: { description: 'Role type fetched successfully' },
        404: { description: 'Role type not found' },
    },
});

// search role types
registry.registerPath({
    method: 'get',
    path: '/role-types',
    tags: ['ROLE-TYPE'],
    summary: 'Search role types',
    request: {
        query: SearchRoleTypeQuerySchema,
    },
    responses: {
        200: { description: 'Role types fetched successfully' },
    },
});

// create role type
registry.registerPath({
    method: 'post',
    path: '/role-types',
    tags: ['ROLE-TYPE'],
    summary: 'Create role type',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: CreateRoleTypePayloadSchema,
                },
            },
        },
    },
    responses: {
        201: { description: 'Role type created successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Tenant not found' },
        409: { description: 'Role type with this code already exists' },
    },
});

// update role type
registry.registerPath({
    method: 'put',
    path: '/role-types/{id}',
    tags: ['ROLE-TYPE'],
    summary: 'Update role type',
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
                    schema: UpdateRoleTypePayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Role type updated successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Role type not found' },
    },
});

// =======================================================================
// ======================== EXPORT GET ROLE TYPE =========================
// =======================================================================
RoleTypeRouter.get(
    '/:id',
    AuthorizeMiddleware([TENANT_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.ADMIN.code]),
    RoleTypeController.get,
);
RoleTypeRouter.put(
    '/:id',
    AuthorizeMiddleware([TENANT_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.ADMIN.code]),
    RoleTypeController.update,
);

RoleTypeRouter.get(
    '/',
    AuthorizeMiddleware([TENANT_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.ADMIN.code]),
    RoleTypeController.search,
);
RoleTypeRouter.post(
    '/',
    AuthorizeMiddleware([TENANT_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.ADMIN.code]),
    RoleTypeController.create,
);
