// Invoice Constants

// feeds the sequential invoice code (INV-000001) via the global counter module
export const INVOICE_COUNTER_ENTITY = 'invoice';

export const INVOICE_STATUS = {
    DRAFT: 'draft',
    APPROVED: 'approved',
    ISSUED: 'issued',
    GRN_SIGNED: 'grn_signed',
    PAID: 'paid',
    CANCELLED: 'cancelled',
};

export const INVOICE_TRANSITION_MAP: Record<string, string[]> = {
    [INVOICE_STATUS.DRAFT]: [INVOICE_STATUS.APPROVED],
    [INVOICE_STATUS.APPROVED]: [INVOICE_STATUS.ISSUED],
    [INVOICE_STATUS.ISSUED]: [INVOICE_STATUS.GRN_SIGNED, INVOICE_STATUS.CANCELLED],
    [INVOICE_STATUS.GRN_SIGNED]: [INVOICE_STATUS.PAID],
    [INVOICE_STATUS.PAID]: [],
    [INVOICE_STATUS.CANCELLED]: [],
};

// ================= INVOICE PERMISSIONS CONSTANTS ===============

export const INVOICE_PERMISSIONS = {
    MANAGE: {
        code: 'invoice:manage',
        name: 'Manage Invoice',
        description: 'Manage invoices (full visibility across the tenant)',
    } as const,

    SEARCH: {
        code: 'invoice:search',
        name: 'Search Invoice',
        description: 'Search invoices',
    } as const,

    CREATE: {
        code: 'invoice:create',
        name: 'Create Invoice',
        description: 'Create invoices',
    } as const,

    UPDATE: {
        code: 'invoice:update',
        name: 'Update Invoice',
        description: 'Update invoices',
    } as const,

    GET: {
        code: 'invoice:get',
        name: 'Get Invoice',
        description: 'Get invoices',
    } as const,
};
