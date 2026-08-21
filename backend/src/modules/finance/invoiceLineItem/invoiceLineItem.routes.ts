// InvoiceLineItem Routes
import express from 'express';
import { InvoiceLineItemController } from './invoiceLineItem.controller';
import { registry } from '../../../shared/config/swagger/swagger.registry';
import {
    CreateInvoiceLineItemPayloadSchema,
    SearchInvoiceLineItemQuerySchema,
    UpdateInvoiceLineItemPayloadSchema,
} from './invoiceLineItem.validators';
import { AuthMiddleware } from '../../../shared/middlewares/authmiddleware';
import { AuthorizeMiddleware } from '../../../shared/middlewares/authorizeMiddleware';
import { INVOICE_LINE_ITEM_PERMISSIONS } from './invoiceLineItem.constants';
import { TENANT_PERMISSIONS } from '../../access-management/tenant/tenant.constants';

export const InvoiceLineItemRouter = express.Router();

InvoiceLineItemRouter.use(AuthMiddleware);

// get invoice line item
registry.registerPath({
    method: 'get',
    path: '/invoice-line-items/{id}',
    tags: ['INVOICE LINE ITEM'],
    summary: 'Get invoice line item',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'Invoice line item fetched successfully' },
        404: { description: 'Invoice line item not found' },
    },
});

// search invoice line items (scoped to one invoice)
registry.registerPath({
    method: 'get',
    path: '/invoice-line-items',
    tags: ['INVOICE LINE ITEM'],
    summary: 'Search invoice line items (invoice filter is required — lines are scoped to their invoice)',
    request: {
        query: SearchInvoiceLineItemQuerySchema,
    },
    responses: {
        200: { description: 'Invoice line items fetched successfully' },
    },
});

// create invoice line item
registry.registerPath({
    method: 'post',
    path: '/invoice-line-items',
    tags: ['INVOICE LINE ITEM'],
    summary: 'Add a line item to a draft invoice (recomputes the invoice subtotal/total)',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: CreateInvoiceLineItemPayloadSchema,
                },
            },
        },
    },
    responses: {
        201: { description: 'Invoice line item created successfully' },
        400: { description: 'Validation error or camp/company mismatch' },
        404: { description: 'Invoice or camp not found' },
        409: { description: 'Invoice is not a draft, or the camp is already invoiced' },
    },
});

// update invoice line item
registry.registerPath({
    method: 'put',
    path: '/invoice-line-items/{id}',
    tags: ['INVOICE LINE ITEM'],
    summary: 'Update a line item amount on a draft invoice (recomputes the invoice subtotal/total)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: UpdateInvoiceLineItemPayloadSchema,
                },
            },
        },
    },
    responses: {
        200: { description: 'Invoice line item updated successfully' },
        400: { description: 'Validation error' },
        404: { description: 'Invoice line item not found' },
        409: { description: 'Invoice is not a draft' },
    },
});

// delete invoice line item
registry.registerPath({
    method: 'delete',
    path: '/invoice-line-items/{id}',
    tags: ['INVOICE LINE ITEM'],
    summary: 'Remove a line item from a draft invoice (recomputes the invoice subtotal/total)',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
        200: { description: 'Invoice line item deleted successfully' },
        404: { description: 'Invoice line item not found' },
        409: { description: 'Invoice is not a draft' },
    },
});

// =======================================================================
// ==================== EXPORT INVOICE LINE ITEM ROUTES ==================
// =======================================================================

InvoiceLineItemRouter.get(
    '/:id',
    AuthorizeMiddleware([
        INVOICE_LINE_ITEM_PERMISSIONS.GET.code,
        INVOICE_LINE_ITEM_PERMISSIONS.MANAGE.code,
        TENANT_PERMISSIONS.MANAGE.code,
    ]),
    InvoiceLineItemController.get,
);
InvoiceLineItemRouter.put(
    '/:id',
    AuthorizeMiddleware([
        INVOICE_LINE_ITEM_PERMISSIONS.UPDATE.code,
        INVOICE_LINE_ITEM_PERMISSIONS.MANAGE.code,
        TENANT_PERMISSIONS.MANAGE.code,
    ]),
    InvoiceLineItemController.update,
);
InvoiceLineItemRouter.delete(
    '/:id',
    AuthorizeMiddleware([
        INVOICE_LINE_ITEM_PERMISSIONS.DELETE.code,
        INVOICE_LINE_ITEM_PERMISSIONS.MANAGE.code,
        TENANT_PERMISSIONS.MANAGE.code,
    ]),
    InvoiceLineItemController.remove,
);
InvoiceLineItemRouter.get(
    '/',
    AuthorizeMiddleware([
        INVOICE_LINE_ITEM_PERMISSIONS.SEARCH.code,
        INVOICE_LINE_ITEM_PERMISSIONS.MANAGE.code,
        TENANT_PERMISSIONS.MANAGE.code,
    ]),
    InvoiceLineItemController.search,
);
InvoiceLineItemRouter.post(
    '/',
    AuthorizeMiddleware([
        INVOICE_LINE_ITEM_PERMISSIONS.CREATE.code,
        INVOICE_LINE_ITEM_PERMISSIONS.MANAGE.code,
        TENANT_PERMISSIONS.MANAGE.code,
    ]),
    InvoiceLineItemController.create,
);
