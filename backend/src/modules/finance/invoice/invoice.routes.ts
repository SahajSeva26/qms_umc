// Invoice Routes
import express from 'express';
import { InvoiceController } from './invoice.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import {
    CreateInvoicePayloadSchema,
    InvoiceReportQuerySchema,
    MoveStagePayloadSchema,
    SearchInvoiceQuerySchema,
    UpdateInvoicePayloadSchema,
} from './invoice.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../../shared/middlewares/authorizeMiddleware';
import { reportRateLimiter } from '../../../shared/middlewares/rateLimiter';
import { INVOICE_PERMISSIONS } from './invoice.constants';
import { TENANT_PERMISSIONS } from '../../access-management/tenant/tenant.constants';

export const InvoiceRouter = express.Router();

InvoiceRouter.use(AuthMiddleware);

// invoice report
registry.registerPath({
    method: 'get',
    path: '/invoices/report',
    tags: ['INVOICE'],
    summary: 'Get invoice statistics report (manager-only, requires invoice:manage)',
    description: [
        'Invoice value and volume broken down by lifecycle status, for the caller-visible tenant scope.',
        '',
        'Summary buckets are mutually exclusive and together cover every matched invoice, so',
        'issuedValue + notYetIssuedValue + cancelledValue equals the sum of invoice.total across all matched invoices:',
        '- issuedValue: invoice value in the statuses reached through the issued lifecycle (issued, grn_signed, paid).',
        '- notYetIssuedValue: invoice value not yet issued (draft, approved). Draft line items are still editable, so these amounts are provisional.',
        '- cancelledValue: invoice value of cancelled invoices. Excluded from issuedValue — a cancelled invoice releases its camps to be billed again, so counting both would double-count the same camp.',
        '',
        'byStatus[].value is the invoice value of invoices currently in that status. For status "paid" this is the invoice value of invoices marked paid; it is NOT money collected, and the data model holds no payment amount.',
        '',
        'The reporting date is issueDate, which remains editable after an invoice moves to a later status. This endpoint is therefore a current-state dashboard view, not immutable accounting or audit history.',
    ].join('\n'),
    request: {
        query: InvoiceReportQuerySchema,
    },
    responses: {
        200: { description: 'Invoice report generated successfully' },
        400: { description: 'Validation error' },
        403: { description: 'Forbidden' },
    },
});

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
    '/report',
    reportRateLimiter,
    AuthorizeMiddleware([INVOICE_PERMISSIONS.MANAGE.code]),
    InvoiceController.report,
);

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
