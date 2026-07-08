import express from 'express';
import { UserController } from './user.controller';
import { registry } from '../../shared/config/swagger/swagger.registry';

import { SearchUserQuerySchema, UpdateUserPayloadSchema } from './user.validators';
import { AuthMiddleware } from '../../shared/middlewares/authmiddleware';
import { PERMISSIONS } from '../../shared/env/permissions';
import { AuthorizeMiddleware } from '../../shared/middlewares/authorizeMiddleware';

export const UserRouter = express.Router();

UserRouter.use(AuthMiddleware);
// get user
registry.registerPath({
    method: 'get',
    path: '/users/{id}',
    tags: ['USER'],
    summary: 'Get user',
    parameters: [
        {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
        },
    ],
    responses: {
        200: { description: 'User fetched successfully' },
        400: { description: 'User fetch failed' },
    },
});

//search user
registry.registerPath({
    method: 'get',
    path: '/users',
    tags: ['USER'],
    summary: 'Search users',
    request: {
        query: SearchUserQuerySchema,
    },
    responses: {
        200: { description: 'User searched successfully' },
        400: { description: 'User search failed' },
    },
});

// Update user
registry.registerPath({
    method: 'put',
    path: '/users/{id}',
    tags: ['USER'],
    summary: 'Update user',
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
                    schema: UpdateUserPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'User updated successfully' },
        400: { description: 'User update failed' },
    },
});

UserRouter.get(
    '/:id',
    AuthorizeMiddleware([PERMISSIONS.USER.GET, PERMISSIONS.SYSTEM.MANAGE], 'OR'),
    UserController.get,
);
UserRouter.put(
    '/:id',
    AuthorizeMiddleware([PERMISSIONS.USER.UPDATE, PERMISSIONS.SYSTEM.MANAGE], 'OR'),
    UserController.update,
);
UserRouter.get('/', UserController.search);
