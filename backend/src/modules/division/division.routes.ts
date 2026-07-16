import express from 'express';
import { DivisionController } from './division.controller';
import { registry } from '../../shared/config/swagger/swagger.registry';
import {
    CreateDivisionPayloadSchema,
    SearchDivisionQuerySchema,
    UpdateDivisionPayloadSchema,
} from './division.validators';
import { AuthMiddleware } from '../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../shared/middlewares/authorizeMiddleware';
import { DIVISION_PERMISSIONS } from './division.constants';
import { TENANT_PERMISSIONS } from '../access-management/tenant/tenant.constants';
import { LEAD_PERMISSIONS } from '../crm/lead/lead.constants';

export const DivisionRouter = express.Router();

DivisionRouter.use(AuthMiddleware);

// get division
registry.registerPath({
    method: 'get',
    path: '/divisions/{id}',
    tags: ['DIVISION'],
    summary: 'Get division',
    parameters: [
        {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
        },
    ],
    responses: {
        200: { description: 'Division fetched successfully' },
        404: { description: 'Division not found' },
    },
});

// search divisions
registry.registerPath({
    method: 'get',
    path: '/divisions',
    tags: ['DIVISION'],
    summary: 'Search divisions',
    request: {
        query: SearchDivisionQuerySchema,
    },
    responses: {
        200: { description: 'Divisions fetched successfully' },
    },
});

// create division
registry.registerPath({
    method: 'post',
    path: '/divisions',
    tags: ['DIVISION'],
    summary: 'Create division',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: CreateDivisionPayloadSchema,
                },
            },
        },
    },
    responses: {
        201: { description: 'Division created successfully' },
        400: { description: 'Validation error' },
        409: { description: 'Division with this code already exists' },
    },
});

// update division
registry.registerPath({
    method: 'put',
    path: '/divisions/{id}',
    tags: ['DIVISION'],
    summary: 'Update division',
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
                    schema: UpdateDivisionPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Division updated successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Division not found' },
    },
});

// =======================================================================
// ========================= EXPORT DIVISION ROUTES ======================
// =======================================================================
DivisionRouter.get(
    '/:id',
    AuthorizeMiddleware([DIVISION_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.ADMIN.code]),
    DivisionController.get,
);
DivisionRouter.put(
    '/:id',
    AuthorizeMiddleware([DIVISION_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.ADMIN.code]),
    DivisionController.update,
);

DivisionRouter.get(
    '/',
    AuthorizeMiddleware([
        DIVISION_PERMISSIONS.MANAGE.code,
        TENANT_PERMISSIONS.ADMIN.code,
        LEAD_PERMISSIONS.MANAGE.code,
    ]),
    DivisionController.search,
);
DivisionRouter.post(
    '/',
    AuthorizeMiddleware([DIVISION_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.ADMIN.code]),
    DivisionController.create,
);
