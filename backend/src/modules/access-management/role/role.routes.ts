import express from 'express';
import { RoleController } from './role.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import {
    CreateRolePayloadSchema,
    SearchRoleQuerySchema,
    UpdateRolePayloadSchema,
} from './role.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../../shared/middlewares/authorizeMiddleware';
import { PERMISSIONS } from '../../../shared/env/permissions';
import { TENANT_PERMISSIONS } from '../tenant/tenant.constants';

export const RoleRouter = express.Router();

RoleRouter.use(AuthMiddleware);
// get role
registry.registerPath({
    method: 'get',
    path: '/roles/{id}',
    tags: ['ROLE'],
    summary: 'Get role',
    parameters: [
        {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
        },
    ],
    responses: {
        200: { description: 'Role fetched successfully' },
        404: { description: 'Role not found' },
    },
});

// search roles
registry.registerPath({
    method: 'get',
    path: '/roles',
    tags: ['ROLE'],
    summary: 'Search roles',
    request: {
        query: SearchRoleQuerySchema,
    },
    responses: {
        200: { description: 'Roles fetched successfully' },
    },
});

// create role
registry.registerPath({
    method: 'post',
    path: '/roles',
    tags: ['ROLE'],
    summary: 'Create role',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: CreateRolePayloadSchema,
                },
            },
        },
    },
    responses: {
        201: { description: 'Role created successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Tenant, role type, or user not found' },
        409: { description: 'Role with this code already exists' },
    },
});

// update role
registry.registerPath({
    method: 'put',
    path: '/roles/{id}',
    tags: ['ROLE'],
    summary: 'Update role',
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
                    schema: UpdateRolePayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Role updated successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Role not found' },
    },
});

RoleRouter.get(
    '/:id',
    AuthorizeMiddleware([TENANT_PERMISSIONS.ADMIN.code, TENANT_PERMISSIONS.MANAGE.code]),
    RoleController.get,
);
RoleRouter.put(
    '/:id',
    AuthorizeMiddleware([TENANT_PERMISSIONS.ADMIN.code, TENANT_PERMISSIONS.MANAGE.code]),
    RoleController.update,
);
RoleRouter.get(
    '/',
    AuthorizeMiddleware([TENANT_PERMISSIONS.ADMIN.code, TENANT_PERMISSIONS.MANAGE.code]),
    RoleController.search,
);
RoleRouter.post(
    '/',
    AuthorizeMiddleware([TENANT_PERMISSIONS.ADMIN.code, TENANT_PERMISSIONS.MANAGE.code]),
    RoleController.create,
);
