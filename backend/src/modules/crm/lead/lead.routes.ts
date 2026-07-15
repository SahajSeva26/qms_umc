import express from 'express';
import { LeadController } from './lead.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import {
    CreateLeadPayloadSchema,
    MoveStagePayloadSchema,
    SearchLeadQuerySchema,
    UpdateLeadPayloadSchema,
} from './lead.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../../shared/middlewares/authorizeMiddleware';
import { LEAD_PERMISSIONS } from './lead.constants';
import { TENANT_PERMISSIONS } from '../../access-management/tenant/tenant.constants';

export const LeadRouter = express.Router();

LeadRouter.use(AuthMiddleware);

const GUARD = [LEAD_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.ADMIN.code];

// get lead
registry.registerPath({
    method: 'get',
    path: '/leads/{id}',
    tags: ['LEAD'],
    summary: 'Get lead',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'Lead fetched successfully' },
        404: { description: 'Lead not found' },
    },
});

// search leads
registry.registerPath({
    method: 'get',
    path: '/leads',
    tags: ['LEAD'],
    summary: 'Search leads',
    request: {
        query: SearchLeadQuerySchema,
    },
    responses: {
        200: { description: 'Leads fetched successfully' },
    },
});

// create lead
registry.registerPath({
    method: 'post',
    path: '/leads',
    tags: ['LEAD'],
    summary: 'Create lead',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: CreateLeadPayloadSchema,
                },
            },
        },
    },
    responses: {
        201: { description: 'Lead created successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Division not found' },
    },
});

// update lead
registry.registerPath({
    method: 'put',
    path: '/leads/{id}',
    tags: ['LEAD'],
    summary: 'Update lead',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: UpdateLeadPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Lead updated successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Lead not found' },
    },
});

// move lead stage
registry.registerPath({
    method: 'patch',
    path: '/leads/{id}/stage',
    tags: ['LEAD'],
    summary: 'Move lead to a new stage (records reason in stage history)',
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
        200: { description: 'Lead stage updated successfully' },
        400: { description: 'Invalid stage transition or validation error' },
        404: { description: 'Lead not found' },
    },
});

// =======================================================================
// ========================== EXPORT LEAD ROUTES =========================
// =======================================================================
LeadRouter.get('/:id', AuthorizeMiddleware(GUARD), LeadController.get);
LeadRouter.put('/:id', AuthorizeMiddleware(GUARD), LeadController.update);
LeadRouter.patch('/:id/stage', AuthorizeMiddleware(GUARD), LeadController.moveStage);

LeadRouter.get('/', AuthorizeMiddleware(GUARD), LeadController.search);
LeadRouter.post('/', AuthorizeMiddleware(GUARD), LeadController.create);
