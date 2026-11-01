// File Constants

export const FILE_STATUS = {
    DRAFT: 'draft', // record created, not yet in use
    ACTIVE: 'active', // current and available for use
    INACTIVE: 'inactive', // exists, not current (superseded/archived), still retrievable
    DISCARDED: 'discarded', // soft-deleted, terminal
} as const;

export const FILE_TYPE = {
    DOCUMENT: 'document',
    IMAGE: 'image',
} as const;


export const FILE_TRANSITION_MAP = {
    [FILE_STATUS.DRAFT]: [FILE_STATUS.ACTIVE, FILE_STATUS.INACTIVE, FILE_STATUS.DISCARDED],
    [FILE_STATUS.ACTIVE]: [FILE_STATUS.INACTIVE, FILE_STATUS.DISCARDED],
    [FILE_STATUS.INACTIVE]: [FILE_STATUS.ACTIVE, FILE_STATUS.DISCARDED],
    [FILE_STATUS.DISCARDED]: [],
} as const;

// NOTE: the file module is domain-agnostic — it does NOT know entity types, relations, or caps.
// Each calling domain (e.g. camp) owns its own entity type / relation / cap config and passes the
// resolved values in. The file module accepts them as-is.

// ================= FILE PERMISSIONS CONSTANTS ===============

export const FILE_PERMISSIONS = {
    MANAGE: {
        code: 'file:manage',
        name: 'Manage File',
        description: 'Manage files (full visibility, incl. discarded)',
    } as const,
};
