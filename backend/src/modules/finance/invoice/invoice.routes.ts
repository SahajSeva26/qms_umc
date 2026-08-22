// Invoice Routes
import express from 'express';
import { InvoiceController } from './invoice.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import {
    CreateInvoicePayloadSchema,
    MoveStagePayloadSchema,
    SearchInvoiceQuerySchema,
    UpdateInvoicePayloadSchema,
} from './invoice.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../../shared/middlewares/authorizeMiddleware';
import { INVOICE_PERMISSIONS } from './invoice.constants';
import { TENANT_PERMISSIONS } from '../../access-management/tenant/tenant.constants';

export const InvoiceRouter = express.Router();

InvoiceRouter.use(AuthMiddleware);

// get invoice
registry.registerPath({
    method: 'get',
    path: '/invoices/{id}',
    tags: ['INVOICE'],
    summary: 'Get invoice',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'Invoice fetched successfully' },
        404: { description: 'Invoice not found' },
    },
});

// search invoices
registry.registerPath({
    method: 'get',
    path: '/invoices',
    tags: ['INVOICE'],
    summary: 'Search invoices',
    request: {
        query: SearchInvoiceQuerySchema,
    },
    responses: {
        200: { description: 'Invoices fetched successfully' },
    },
});

// create invoice
registry.registerPath({
    method: 'post',
    path: '/invoices',
    tags: ['INVOICE'],
    summary: 'Create invoice (tenant derived from project; total computed from subtotal + tax - discount)',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: CreateInvoicePayloadSchema,
                },
            },
        },
    },
    responses: {
        201: { description: 'Invoice created successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Project not found' },
    },
});

// update invoice
registry.registerPath({
    method: 'put',
    path: '/invoices/{id}',
    tags: ['INVOICE'],
    summary: 'Update invoice',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: UpdateInvoicePayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Invoice updated successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Invoice not found' },
    },
});

// move invoice stage
registry.registerPath({
    method: 'patch',
    path: '/invoices/{id}/stage',
    tags: ['INVOICE'],
    summary: 'Move invoice to a new stage (records reason in stage history)',
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
        200: { description: 'Invoice stage updated successfully' },
        400: { description: 'Invalid stage transition or validation error' },
        404: { description: 'Invoice not found' },
    },
});

// =======================================================================
// ======================= EXPORT INVOICE ROUTES =========================
// =======================================================================

InvoiceRouter.get(
    '/:id',
    AuthorizeMiddleware([INVOICE_PERMISSIONS.GET.code, INVOICE_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code]),
    InvoiceController.get,
);
InvoiceRouter.put(
    '/:id',
    AuthorizeMiddleware([INVOICE_PERMISSIONS.UPDATE.code, INVOICE_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code]),
    InvoiceController.update,
);
InvoiceRouter.patch(
    '/:id/stage',
    AuthorizeMiddleware([INVOICE_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code]),
    InvoiceController.moveStage,
);
InvoiceRouter.get(
    '/',
    AuthorizeMiddleware([INVOICE_PERMISSIONS.SEARCH.code, INVOICE_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code]),
    InvoiceController.search,
);
InvoiceRouter.post(
    '/',
    AuthorizeMiddleware([INVOICE_PERMISSIONS.CREATE.code, INVOICE_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code]),
    InvoiceController.create,
);
