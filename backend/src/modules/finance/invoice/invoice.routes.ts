// Invoice Routes
import express from 'express';
import { InvoiceController } from './invoice.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import {
    CreateInvoicePayloadSchema,
    GetInvoiceFilesQuerySchema,
    InvoiceFileActivatePayloadSchema,
    InvoiceFilePostPayloadSchema,
    InvoiceReportQuerySchema,
    MoveStagePayloadSchema,
    SearchInvoiceQuerySchema,
    UpdateInvoicePayloadSchema,
} from './invoice.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { Authorize } from '../../../shared/middlewares/authorize.middleware';
import { reportRateLimiter } from '../../../shared/middlewares/rateLimiter';
import { INVOICE_PERMISSIONS } from './invoice.constants';
import { TENANT_PERMISSIONS } from '../../access-management/tenant/tenant.constants';

export const InvoiceRouter = express.Router();

InvoiceRouter.use(AuthMiddleware);

// invoice report (tenant-wide billing totals + per-status breakdown — global for platform actors)
registry.registerPath({
    method: 'get',
    path: '/invoices/report',
    tags: ['INVOICE'],
    summary: 'Invoice pipeline report (total invoiced + per-status counts/amounts; optional tenant/project/date scope)',
    request: {
        query: InvoiceReportQuerySchema,
    },
    responses: {
        200: { description: 'Invoice report generated successfully' },
        400: { description: 'Validation error' },
    },
});

// list an invoice's files (optionally for one relation, e.g. the GRN document)
registry.registerPath({
    method: 'get',
    path: '/invoices/files',
    tags: ['INVOICE'],
    summary: "List an invoice's active files (optionally narrowed to one relation)",
    request: {
        query: GetInvoiceFilesQuerySchema,
    },
    responses: {
        200: { description: 'Invoice files fetched successfully' },
        404: { description: 'Invoice not found' },
    },
});

// create upload intent(s) for an invoice file relation — presigned upload URL per file
registry.registerPath({
    method: 'post',
    path: '/invoices/files',
    tags: ['INVOICE'],
    summary: 'Register invoice file(s) from metadata (draft) and get a presigned upload URL per file',
    request: {
        body: { content: { 'application/json': { schema: InvoiceFilePostPayloadSchema } } },
    },
    responses: {
        201: { description: 'Upload intent created; response carries an uploadUrl per file' },
        400: { description: 'Validation error / unsupported type or size' },
        404: { description: 'Invoice not found' },
        409: { description: 'Invalid invoice status or cap exceeded' },
    },
});

// activate uploaded draft invoice files (after the client uploads via the presigned URLs)
registry.registerPath({
    method: 'post',
    path: '/invoices/files/activate',
    tags: ['INVOICE'],
    summary: 'Flip a batch of draft invoice files to active (after upload to storage)',
    request: {
        body: { content: { 'application/json': { schema: InvoiceFileActivatePayloadSchema } } },
    },
    responses: {
        200: { description: 'Invoice files activated' },
        400: { description: 'A file does not belong to this invoice' },
        404: { description: 'Invoice or file not found' },
        409: { description: 'A file cannot be activated (not uploaded / invalid transition)' },
    },
});

// discard one invoice file (soft-delete; frees the relation cap for a re-upload)
registry.registerPath({
    method: 'delete',
    path: '/invoices/files/{id}',
    tags: ['INVOICE'],
    summary: 'Discard an invoice file (soft-delete)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'Invoice file discarded' },
        404: { description: 'Invoice file not found' },
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

// report must be registered BEFORE '/:id' so "report" isn't captured as an invoice id
InvoiceRouter.get(
    '/report',
    reportRateLimiter,
    Authorize.anyPermissions([INVOICE_PERMISSIONS.SEARCH.code, INVOICE_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code]),
    InvoiceController.report,
);

// invoice files — list an invoice's files; MUST be before '/:id' so 'files' isn't treated as an id.
// Read-gated like the invoice read routes (service own-scopes the caller to the invoices they can see).
InvoiceRouter.get(
    '/files',
    Authorize.anyPermissions([
        INVOICE_PERMISSIONS.GET.code,
        INVOICE_PERMISSIONS.SEARCH.code,
        INVOICE_PERMISSIONS.MANAGE.code,
        TENANT_PERMISSIONS.MANAGE.code,
    ]),
    InvoiceController.getInvoiceFiles,
);

// invoice files — create upload intent(s) + activate uploaded drafts + discard one. Edit-gated
// (invoice:update / manage / tenant:manage); the service resolves + own-scopes the invoice.
InvoiceRouter.post(
    '/files',
    Authorize.anyPermissions([INVOICE_PERMISSIONS.UPDATE.code, INVOICE_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code]),
    InvoiceController.invoiceFiles,
);
InvoiceRouter.post(
    '/files/activate',
    Authorize.anyPermissions([INVOICE_PERMISSIONS.UPDATE.code, INVOICE_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code]),
    InvoiceController.invoiceFileActivate,
);
InvoiceRouter.delete(
    '/files/:id',
    Authorize.anyPermissions([INVOICE_PERMISSIONS.UPDATE.code, INVOICE_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code]),
    InvoiceController.invoiceFileDiscard,
);

InvoiceRouter.get(
    '/:id',
    Authorize.anyPermissions([INVOICE_PERMISSIONS.GET.code, INVOICE_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code]),
    InvoiceController.get,
);
InvoiceRouter.put(
    '/:id',
    Authorize.anyPermissions([INVOICE_PERMISSIONS.UPDATE.code, INVOICE_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code]),
    InvoiceController.update,
);
InvoiceRouter.patch(
    '/:id/stage',
    Authorize.anyPermissions([INVOICE_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code]),
    InvoiceController.moveStage,
);
InvoiceRouter.get(
    '/',
    Authorize.anyPermissions([INVOICE_PERMISSIONS.SEARCH.code, INVOICE_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code]),
    InvoiceController.search,
);
InvoiceRouter.post(
    '/',
    Authorize.anyPermissions([INVOICE_PERMISSIONS.CREATE.code, INVOICE_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code]),
    InvoiceController.create,
);
