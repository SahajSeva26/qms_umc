// File Constants

export const FILE_STATUS = {
    DRAFT: 'draft', // signed URL issued / record created, upload not confirmed
    UPLOADED: 'uploaded', // bytes received, not yet validated/processed
    PROCESSING: 'processing', // async pipeline running (scan, validate, generate variants)
    ACTIVE: 'active', // passed all checks, safe and available for use
    INACTIVE: 'inactive', // exists, not current (superseded/archived), still retrievable
    FAILED: 'failed', // upload never completed, or processing rejected it
    DISCARDED: 'discarded',
} as const;

export const FILE_TYPE = {
    DOCUMENT: 'document',
    IMAGE: 'image',
} as const;


export const FILE_TRANSITION_MAP = {
    [FILE_STATUS.DRAFT]: [FILE_STATUS.UPLOADED, FILE_STATUS.PROCESSING, FILE_STATUS.ACTIVE, FILE_STATUS.INACTIVE, FILE_STATUS.FAILED, FILE_STATUS.DISCARDED],
    [FILE_STATUS.UPLOADED]: [FILE_STATUS.PROCESSING, FILE_STATUS.ACTIVE, FILE_STATUS.INACTIVE, FILE_STATUS.FAILED, FILE_STATUS.DISCARDED],
    [FILE_STATUS.PROCESSING]: [FILE_STATUS.ACTIVE, FILE_STATUS.INACTIVE, FILE_STATUS.FAILED, FILE_STATUS.DISCARDED],
    [FILE_STATUS.ACTIVE]: [FILE_STATUS.INACTIVE, FILE_STATUS.DISCARDED],
    [FILE_STATUS.INACTIVE]: [FILE_STATUS.ACTIVE, FILE_STATUS.DISCARDED],
    [FILE_STATUS.FAILED]: [FILE_STATUS.DISCARDED],
    [FILE_STATUS.DISCARDED]: [],
} as const;

export const ENTITY_TYPE = {
    USER: 'user',

    TENANT: 'tenant',
    LEAD: 'lead',
    PROJECT: 'project',

    CAMP: 'camp',
    INVOICE: 'invoice',
    SCREENING: 'screening',
    TEST: 'test',
} as const;

export const ENTITY_RELATION = {
    //user
    [ENTITY_TYPE.USER]: {
        PROFILE_PICTURE: 'profile_picture',
    },

    //tenant
    [ENTITY_TYPE.TENANT]: {
        LOGO: 'logo',
    },

    // Add more entity types and their categories here
} as const;

export const ENTITY_RELATION_ARRAY = Object.values(ENTITY_RELATION).flatMap((categories) =>
    Object.values(categories),
);

// ================= FILE PERMISSIONS CONSTANTS ===============

export const FILE_PERMISSIONS = {
    MANAGE: {
        code: 'file:manage',
        name: 'Manage File',
        description: 'Manage files (full visibility, incl. discarded)',
    } as const,
};
