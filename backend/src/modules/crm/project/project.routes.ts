import express from 'express';
import { ProjectController } from './project.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import {
    CreateProjectPayloadSchema,
    MoveStagePayloadSchema,
    SearchProjectQuerySchema,
    UpdateProjectPayloadSchema,
} from './project.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../../shared/middlewares/authorizeMiddleware';
import { PROJECT_PERMISSIONS } from './project.constants';
import { TENANT_PERMISSIONS } from '../../access-management/tenant/tenant.constants';

export const ProjectRouter = express.Router();

ProjectRouter.use(AuthMiddleware);

// get project
registry.registerPath({
    method: 'get',
    path: '/projects/{id}',
    tags: ['PROJECT'],
    summary: 'Get project',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'Project fetched successfully' },
        404: { description: 'Project not found' },
    },
});

// search projects
registry.registerPath({
    method: 'get',
    path: '/projects',
    tags: ['PROJECT'],
    summary: 'Search projects',
    request: {
        query: SearchProjectQuerySchema,
    },
    responses: {
        200: { description: 'Projects fetched successfully' },
    },
});

// create project
registry.registerPath({
    method: 'post',
    path: '/projects',
    tags: ['PROJECT'],
    summary: 'Create project (from a won lead)',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: CreateProjectPayloadSchema,
                },
            },
        },
    },
    responses: {
        201: { description: 'Project created successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Lead not found' },
        409: { description: 'A project already exists for this lead' },
    },
});

// update project
registry.registerPath({
    method: 'put',
    path: '/projects/{id}',
    tags: ['PROJECT'],
    summary: 'Update project',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: UpdateProjectPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Project updated successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Project not found' },
    },
});

// move project stage
registry.registerPath({
    method: 'patch',
    path: '/projects/{id}/stage',
    tags: ['PROJECT'],
    summary: 'Move project to a new stage (records reason in stage history)',
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
        200: { description: 'Project stage updated successfully' },
        400: { description: 'Invalid stage transition or validation error' },
        404: { description: 'Project not found' },
    },
});

// =======================================================================
// ======================== EXPORT PROJECT ROUTES ========================
// =======================================================================
const GUARD = [PROJECT_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code];
const READ_GUARD = [PROJECT_PERMISSIONS.SEARCH.code, ...GUARD]; // reps (project:search) may read; service scopes them to their own

ProjectRouter.get(
    '/:id',
    AuthorizeMiddleware([
        PROJECT_PERMISSIONS.MANAGE.code,
        PROJECT_PERMISSIONS.SEARCH.code,
        TENANT_PERMISSIONS.MANAGE.code,
    ]),
    ProjectController.get,
);
ProjectRouter.put(
    '/:id',
    AuthorizeMiddleware([PROJECT_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code]),
    ProjectController.update,
);
ProjectRouter.patch(
    '/:id/stage',
    AuthorizeMiddleware([PROJECT_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code]),
    ProjectController.moveStage,
);

ProjectRouter.get('/', AuthorizeMiddleware(READ_GUARD), ProjectController.search);
ProjectRouter.post('/', AuthorizeMiddleware(GUARD), ProjectController.create);
