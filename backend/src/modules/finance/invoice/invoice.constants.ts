// Invoice Constants

import { IEntityFileConfig } from '../../../shared/types/file.types';

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

// ================= INVOICE FILE RELATIONS ===============

export const INVOICE_FILE_ENTITY_TYPE = 'invoice';

// the file relations an invoice supports
export const INVOICE_FILE_RELATIONS = {
    GRN: 'grn',
} as const;

// allowed types + max bytes for a GRN document (a scanned/signed GRN — pdf or image)
const GRN_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const GRN_MAX_SIZE = 10 * 1024 * 1024; // 10 MB

// per-relation config: the invoice statuses during which the file may be uploaded, the cap, and the
// per-file size/mime-type constraints. GRN is uploaded around issue → grn-signed, before payment.
export const INVOICE_FILE_CONFIG: Record<string, IEntityFileConfig> = {
    [INVOICE_FILE_RELATIONS.GRN]: {
        relation: INVOICE_FILE_RELATIONS.GRN,
        statusAllowed: [INVOICE_STATUS.ISSUED, INVOICE_STATUS.GRN_SIGNED],
        cap: 1,
        maxSize: GRN_MAX_SIZE,
        mimeTypes: GRN_MIME_TYPES,
    },
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
