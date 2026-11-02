// Weekly-plan Routes

import express from 'express';
import { WeeklyPlanController } from './weekly-plan.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import {
    CreateWeeklyPlanPayloadSchema,
    MoveStagePayloadSchema,
    SearchWeeklyPlanQuerySchema,
    UpdateWeeklyPlanPayloadSchema,
} from './weekly-plan.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { Authorize } from '../../../shared/middlewares/authorize.middleware';
import { WEEKLY_PLAN_PERMISSIONS } from './weekly-plan.constants';
import { TENANT_PERMISSIONS } from '../../access-management/tenant/tenant.constants';

export const WeeklyPlanRouter = express.Router();

WeeklyPlanRouter.use(AuthMiddleware);

// get weekly plan
registry.registerPath({
    method: 'get',
    path: '/weekly-plans/{id}',
    tags: ['WEEKLY-PLAN'],
    summary: 'Get weekly plan',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'Weekly plan fetched successfully' },
        404: { description: 'Weekly plan not found' },
    },
});

// search weekly plans
registry.registerPath({
    method: 'get',
    path: '/weekly-plans',
    tags: ['WEEKLY-PLAN'],
    summary: 'Search weekly plans',
    request: {
        query: SearchWeeklyPlanQuerySchema,
    },
    responses: {
        200: { description: 'Weekly plans fetched successfully' },
    },
});

// create weekly plan
registry.registerPath({
    method: 'post',
    path: '/weekly-plans',
    tags: ['WEEKLY-PLAN'],
    summary: 'Create weekly plan (owner = creator)',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: CreateWeeklyPlanPayloadSchema,
                },
            },
        },
    },
    responses: {
        201: { description: 'Weekly plan created successfully' },
        400: { description: 'Validation error' },
    },
});

// update weekly plan
registry.registerPath({
    method: 'put',
    path: '/weekly-plans/{id}',
    tags: ['WEEKLY-PLAN'],
    summary: 'Update weekly plan (owner only)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: UpdateWeeklyPlanPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Weekly plan updated successfully' },
        400: { description: 'Validation error' },
        403: { description: 'Only the owner can edit this weekly plan' },
        404: { description: 'Weekly plan not found' },
    },
});

// move weekly plan stage (approve / reject / resubmit)
registry.registerPath({
    method: 'patch',
    path: '/weekly-plans/{id}/stage',
    tags: ['WEEKLY-PLAN'],
    summary: 'Move weekly plan stage — approve/reject (weekly-plan:manage) or resubmit (owner)',
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
        200: { description: 'Weekly plan stage updated successfully' },
        400: { description: 'Invalid stage transition or validation error' },
        403: { description: 'Not allowed to perform this transition' },
        404: { description: 'Weekly plan not found' },
    },
});

// =======================================================================
// ======================= EXPORT WEEKLY-PLAN ROUTES =====================
// =======================================================================
const GUARD = [WEEKLY_PLAN_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code];
// sales people (weekly-plan:search) may read; the service scopes them to plans they own or supervise
const READ_GUARD = [WEEKLY_PLAN_PERMISSIONS.SEARCH.code, WEEKLY_PLAN_PERMISSIONS.GET.code, ...GUARD];

WeeklyPlanRouter.get('/:id', Authorize.anyPermissions(READ_GUARD), WeeklyPlanController.get);

// owner edits their own plan via weekly-plan:update; the service's own-scope + owner check pins it.
WeeklyPlanRouter.put(
    '/:id',
    Authorize.anyPermissions([WEEKLY_PLAN_PERMISSIONS.UPDATE.code, ...GUARD]),
    WeeklyPlanController.update,
);

// approve/reject (requires weekly-plan:manage) or resubmit (owner) — both reach via weekly-plan:update;
// the service enforces the direction-based authorization (manage-for-approve vs owner-for-resubmit).
WeeklyPlanRouter.patch(
    '/:id/stage',
    Authorize.anyPermissions([WEEKLY_PLAN_PERMISSIONS.UPDATE.code, ...GUARD]),
    WeeklyPlanController.moveStage,
);

WeeklyPlanRouter.get('/', Authorize.anyPermissions(READ_GUARD), WeeklyPlanController.search);

WeeklyPlanRouter.post('/', Authorize.anyPermissions([WEEKLY_PLAN_PERMISSIONS.CREATE.code, ...GUARD]), WeeklyPlanController.create);
