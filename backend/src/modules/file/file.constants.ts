// File Constants

export const FILE_STATUS = {
    DRAFT: 'draft',
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    DISCARDED: 'discarded',
} as const;

export const FILE_TYPE = {
    DOCUMENT: 'document',
    IMAGE: 'image',
} as const;

export const FILE_SCOPE = {
    TENANT: 'tenant',
    INTERNAL: 'internal',
    PRIVATE: 'private',
    PUBLIC: 'public',
} as const;

export const FILE_TRANSITION_MAP = {
    [FILE_STATUS.DRAFT]: [FILE_STATUS.ACTIVE, FILE_STATUS.INACTIVE, FILE_STATUS.DISCARDED],
    [FILE_STATUS.ACTIVE]: [FILE_STATUS.INACTIVE, FILE_STATUS.DISCARDED],
    [FILE_STATUS.INACTIVE]: [FILE_STATUS.ACTIVE, FILE_STATUS.DISCARDED],
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

export const ENTITY_TYPE_CATEGORIES = {
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

export const ENTITY_TYPE_CATEGORIES_ARRAY = Object.values(ENTITY_TYPE_CATEGORIES).flatMap((categories) =>
    Object.values(categories),
);
