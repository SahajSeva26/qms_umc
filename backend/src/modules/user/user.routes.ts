import express from 'express';
import { UserController } from './user.controller';
import { registry } from '../../shared/config/swagger/swagger.registry';
import { z } from 'zod';
import { SearchUserQuerySchema, UpdateUserPayloadSchema } from './user.validators';

export const UserRouter = express.Router();

// get user
registry.registerPath({
    method: 'get',
    path: '/user/{id}',
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
    path: '/user',
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
    path: '/user/{id}',
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



UserRouter.get('/:id', UserController.get);
UserRouter.put('/:id', UserController.update);
UserRouter.get('/', UserController.search);
