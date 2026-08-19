import express from 'express';
import { UserController } from './user.controller';
import { registry } from '../../shared/config/swagger/swagger.registry';

import {
    SearchUserQuerySchema,
    UpdateUserPayloadSchema,
    UserReportQuerySchema,
} from './user.validators';
import { AuthMiddleware } from '../../shared/middlewares/authmiddleware';
import { PERMISSIONS } from '../../shared/env/permissions';
import { AuthorizeMiddleware } from '../../shared/middlewares/authorizeMiddleware';

export const UserRouter = express.Router();

// user report (aggregate stats for dashboards — status/gender breakdown, lockouts, registration trend)
registry.registerPath({
    method: 'get',
    path: '/users/report',
    tags: ['USER'],
    summary: 'Get user statistics report',
    request: {
        query: UserReportQuerySchema,
    },
    responses: {
        200: { description: 'User report generated successfully' },
        400: { description: 'Validation error' },
        403: { description: 'Forbidden' },
    },
});

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

// NOTE: /report is declared before /:id so the literal path is not swallowed by the param route.
// Gated on MANAGE, not SEARCH: the report has no tenant filter (see UserService.report), so SEARCH
// (which every customer tenant's permission group already includes — see tenant.service.ts
// createTenant) would let a customer-tenant admin see global, cross-tenant counts. MANAGE is
// structurally confined to the platform tenant by the permission-group ceiling in role.service.ts /
// roleType.service.ts, so this is the only permission that keeps the report platform-only.
UserRouter.get(
    '/report',
    AuthMiddleware,
    AuthorizeMiddleware([PERMISSIONS.USER.MANAGE.code]),
    UserController.report,
);
UserRouter.get(
    '/:id',
    AuthMiddleware,
    AuthorizeMiddleware([PERMISSIONS.USER.GET.code]),
    UserController.get,
);
UserRouter.put(
    '/:id',
    AuthMiddleware,
    AuthorizeMiddleware([PERMISSIONS.USER.UPDATE.code]),
    UserController.update,
);
UserRouter.get(
    '/',
    AuthMiddleware,
    AuthorizeMiddleware([PERMISSIONS.USER.SEARCH.code]),
    UserController.search,
);
