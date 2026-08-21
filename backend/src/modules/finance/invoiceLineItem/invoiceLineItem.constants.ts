// InvoiceLineItem Constants

// ================= INVOICE LINE ITEM PERMISSIONS CONSTANTS ===============

export const INVOICE_LINE_ITEM_PERMISSIONS = {
    MANAGE: {
        code: 'invoice-line-item:manage',
        name: 'Manage Invoice Line Item',
        description: 'Manage invoice line items',
    } as const,

    SEARCH: {
        code: 'invoice-line-item:search',
        name: 'Search Invoice Line Item',
        description: 'Search invoice line items',
    } as const,

    CREATE: {
        code: 'invoice-line-item:create',
        name: 'Create Invoice Line Item',
        description: 'Create invoice line items',
    } as const,

    UPDATE: {
        code: 'invoice-line-item:update',
        name: 'Update Invoice Line Item',
        description: 'Update invoice line items',
    } as const,

    GET: {
        code: 'invoice-line-item:get',
        name: 'Get Invoice Line Item',
        description: 'Get invoice line items',
    } as const,

    DELETE: {
        code: 'invoice-line-item:delete',
        name: 'Delete Invoice Line Item',
        description: 'Delete invoice line items',
    } as const,
};
