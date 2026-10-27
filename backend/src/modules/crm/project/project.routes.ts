import express from 'express';
import { ProjectController } from './project.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import {
    CreateProjectPayloadSchema,
    MoveStagePayloadSchema,
    ProjectReportQuerySchema,
    SearchProjectQuerySchema,
    UpdateProjectPayloadSchema,
} from './project.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../../shared/middlewares/authorizeMiddleware';
import { reportRateLimiter } from '../../../shared/middlewares/rateLimiter';
import { PROJECT_PERMISSIONS } from './project.constants';
import { CAMP_PERMISSIONS } from '../../operations/camp/camp.constants';

export const ProjectRouter = express.Router();

ProjectRouter.use(AuthMiddleware);

// project report
registry.registerPath({
    method: 'get',
    path: '/projects/report',
    tags: ['PROJECT'],
    summary: 'Get project statistics report (total count, status-wise and therapy-wise counts + revenue)',
    request: {
        query: ProjectReportQuerySchema,
    },
    responses: {
        200: { description: 'Project report generated successfully' },
        400: { description: 'Validation error' },
        403: { description: 'Forbidden' },
    },
});

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
// manage-only actions (report + set-live/stage). Project is gated purely on project:* permissions —
// tenant:manage is deliberately not accepted here (it is not of this domain). Sales Head owns set-LIVE.
const MANAGE_GUARD = [PROJECT_PERMISSIONS.MANAGE.code];
// reps (project:search) may read; service scopes them to their own. camp:book lets pharma field-force
// read projects (the service scopes them to their division) so they can pick what to book against.
const READ_GUARD = [PROJECT_PERMISSIONS.SEARCH.code, CAMP_PERMISSIONS.BOOK.code, ...MANAGE_GUARD];

ProjectRouter.get(
    '/report',
    reportRateLimiter,
    AuthorizeMiddleware(MANAGE_GUARD),
    ProjectController.report
);

ProjectRouter.get(
    '/:id',
    AuthorizeMiddleware([
        PROJECT_PERMISSIONS.MANAGE.code,
        PROJECT_PERMISSIONS.SEARCH.code,
        CAMP_PERMISSIONS.BOOK.code, // pharma field-force (book-only) may read projects; service scopes them to their division
    ]),
    ProjectController.get,
);
ProjectRouter.put(
    '/:id',
    AuthorizeMiddleware([PROJECT_PERMISSIONS.MANAGE.code, PROJECT_PERMISSIONS.UPDATE.code]),
    ProjectController.update,
);
ProjectRouter.patch(
    '/:id/stage',
    AuthorizeMiddleware(MANAGE_GUARD),
    ProjectController.moveStage,
);

ProjectRouter.get('/', AuthorizeMiddleware(READ_GUARD), ProjectController.search);
ProjectRouter.post('/', AuthorizeMiddleware([PROJECT_PERMISSIONS.MANAGE.code, PROJECT_PERMISSIONS.CREATE.code]), ProjectController.create);
