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

RoleTypeRouter.get(
    '/:id',
    AuthorizeMiddleware([PERMISSIONS.ROLE_TYPE.GET.code]),
    RoleTypeController.get,
);
RoleTypeRouter.put(
    '/:id',
    AuthorizeMiddleware([PERMISSIONS.ROLE_TYPE.UPDATE.code]),
    RoleTypeController.update,
);
RoleTypeRouter.get(
    '/',
    AuthorizeMiddleware(['ROLE_TYPE.SEARCH']),
    RoleTypeController.search,
);
RoleTypeRouter.post(
    '/',
    AuthorizeMiddleware(['ROLE_TYPE.CREATE']),
    RoleTypeController.create,
);
