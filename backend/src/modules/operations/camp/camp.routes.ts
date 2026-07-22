// Camp Routes
import express from 'express';
import { CampController } from './camp.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import {
    CreateCampPayloadSchema,
    MoveStagePayloadSchema,
    SearchCampQuerySchema,
    UpdateCampPayloadSchema,
} from './camp.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../../shared/middlewares/authorizeMiddleware';
import { CAMP_PERMISSIONS } from './camp.constants';
import { TENANT_PERMISSIONS } from '../../access-management/tenant/tenant.constants';

export const CampRouter = express.Router();

CampRouter.use(AuthMiddleware);

// get camp
registry.registerPath({
    method: 'get',
    path: '/camps/{id}',
    tags: ['CAMP'],
    summary: 'Get camp',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'Camp fetched successfully' },
        404: { description: 'Camp not found' },
    },
});

// search camps
registry.registerPath({
    method: 'get',
    path: '/camps',
    tags: ['CAMP'],
    summary: 'Search camps',
    request: {
        query: SearchCampQuerySchema,
    },
    responses: {
        200: { description: 'Camps fetched successfully' },
    },
});

// create camp
registry.registerPath({
    method: 'post',
    path: '/camps',
    tags: ['CAMP'],
    summary: 'Create camp (tenant + division required; project optional)',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: CreateCampPayloadSchema,
                },
            },
        },
    },
    responses: {
        201: { description: 'Camp created successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Project or division not found' },
    },
});

// update camp
registry.registerPath({
    method: 'put',
    path: '/camps/{id}',
    tags: ['CAMP'],
    summary: 'Update camp',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: UpdateCampPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Camp updated successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Camp not found' },
    },
});

// move camp stage
registry.registerPath({
    method: 'patch',
    path: '/camps/{id}/stage',
    tags: ['CAMP'],
    summary: 'Move camp to a new stage (records reason in stage history)',
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
        200: { description: 'Camp stage updated successfully' },
        400: { description: 'Invalid stage transition or validation error' },
        404: { description: 'Camp not found' },
    },
});

// =======================================================================
// ========================= EXPORT CAMP ROUTES ==========================
// =======================================================================
const GUARD = [CAMP_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code];
const READ_GUARD = [CAMP_PERMISSIONS.SEARCH.code, ...GUARD]; // assigned field-force (camp:search) may read; service scopes them to their own camps

CampRouter.get(
    '/:id',
    AuthorizeMiddleware([CAMP_PERMISSIONS.MANAGE.code, CAMP_PERMISSIONS.SEARCH.code, TENANT_PERMISSIONS.MANAGE.code]),
    CampController.get,
);
CampRouter.put(
    '/:id',
    AuthorizeMiddleware([CAMP_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code]),
    CampController.update,
);
CampRouter.patch(
    '/:id/stage',
    AuthorizeMiddleware([CAMP_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code]),
    CampController.moveStage,
);

CampRouter.get('/', AuthorizeMiddleware(READ_GUARD), CampController.search);
CampRouter.post('/', AuthorizeMiddleware(GUARD), CampController.create);
