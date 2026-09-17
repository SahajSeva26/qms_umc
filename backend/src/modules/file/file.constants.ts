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

// Each relation carries its `name` (the stored string) and a `cap` (max active files per entity; omit for unlimited).
export const ENTITY_RELATION = {
    //user
    [ENTITY_TYPE.USER]: {
        PROFILE_PICTURE: { name: 'profile_picture', cap: 1 },
    },

    //tenant
    [ENTITY_TYPE.TENANT]: {
        LOGO: { name: 'logo', cap: 1 },
    },

    // Add more entity types and their relations here
} as const;

// flat list of every relation record across all entity types
const ENTITY_RELATIONS = Object.values(ENTITY_RELATION).flatMap((group) => Object.values(group));

// the valid relation name strings — used for the zod enum, swagger, and coherence checks
export const ENTITY_RELATION_ARRAY = ENTITY_RELATIONS.map((relation) => relation.name);

// look up the cap (max active files per entity) for an entity type + relation; undefined = unlimited
export const getRelationCap = (type: string, relation: string): number | undefined => {
    const group = (ENTITY_RELATION as any)[type];
    if (!group) {
        return undefined;
    }
    const record = Object.values(group).find((r: any) => r.name === relation) as any;
    return record?.cap;
};

// ================= FILE PERMISSIONS CONSTANTS ===============

export const FILE_PERMISSIONS = {
    MANAGE: {
        code: 'file:manage',
        name: 'Manage File',
        description: 'Manage files (full visibility, incl. discarded)',
    } as const,
};
