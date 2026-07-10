import express from 'express';
import { PermissionGroupController } from './permissionGroup.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import {
    CreatePermissionGroupPayloadSchema,
    SearchPermissionGroupQuerySchema,
    UpdatePermissionGroupPayloadSchema,
} from './permissionGroup.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../../shared/middlewares/authorizeMiddleware';
import { PERMISSION_GROUP_PERMISSIONS } from './permissionGroup.constants';

export const PermissionGroupRouter = express.Router();

PermissionGroupRouter.use(AuthMiddleware);

// get permission group
registry.registerPath({
    method: 'get',
    path: '/permission-groups/{id}',
    tags: ['PERMISSION GROUP'],
    summary: 'Get permission group',
    parameters: [
        {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
        },
    ],
    responses: {
        200: { description: 'Permission group fetched successfully' },
        400: { description: 'Permission group fetch failed' },
        404: { description: 'Permission group not found' },
    },
});

// search permission groups
registry.registerPath({
    method: 'get',
    path: '/permission-groups',
    tags: ['PERMISSION GROUP'],
    summary: 'Search permission groups',
    request: {
        query: SearchPermissionGroupQuerySchema,
    },
    responses: {
        200: { description: 'Permission groups fetched successfully' },
        400: { description: 'Permission group search failed' },
    },
});

// update permission group
registry.registerPath({
    method: 'put',
    path: '/permission-groups/{id}',
    tags: ['PERMISSION GROUP'],
    summary: 'Update permission group',
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
                    schema: UpdatePermissionGroupPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Permission group updated successfully' },
        400: { description: 'Validation failed' },
        404: { description: 'Permission group not found' },
    },
});

// ==========================================================================
// EXPORTED PERMISSION GROUP ROUTES
// ==========================================================================
PermissionGroupRouter.get(
    '/:id',
    AuthorizeMiddleware([PERMISSION_GROUP_PERMISSIONS.GET.code]),
    PermissionGroupController.get,
);
PermissionGroupRouter.get(
    '/',
    AuthorizeMiddleware([PERMISSION_GROUP_PERMISSIONS.SEARCH.code]),
    PermissionGroupController.search,
);
// PermissionGroupRouter.post(
//     '/',
//     AuthorizeMiddleware([PERMISSION_GROUP_PERMISSIONS.CREATE.code]),
//     PermissionGroupController.create,
// );
PermissionGroupRouter.put(
    '/:id',
    AuthorizeMiddleware([PERMISSION_GROUP_PERMISSIONS.UPDATE.code]),
    PermissionGroupController.update,
);
