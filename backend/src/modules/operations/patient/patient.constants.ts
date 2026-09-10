// Patient Constants

// feeds the sequential patient code (pat-000001) via the global counter module
export const PATIENT_COUNTER_ENTITY = 'patient';

export const PATIENT_GENDERS = {
    MALE: 'male',
    FEMALE: 'female',
    OTHER: 'other',
} as const;

// active/inactive is a soft-delete visibility flag — inactive patients are hidden from
// ordinary reads and surfaced only to a manage-level actor.
export const PATIENT_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
} as const;

// ================= PATIENT PERMISSIONS CONSTANTS ===============

export const PATIENT_PERMISSIONS = {
    MANAGE: {
        code: 'patient:manage',
        name: 'Manage Patient',
        description: 'Manage patient records (full visibility, incl. inactive)',
    } as const,

    CREATE: {
        code: 'patient:create',
        name: 'Create Patient',
        description: 'Register patients',
    } as const,

    SEARCH: {
        code: 'patient:search',
        name: 'Search Patient',
        description: 'Search patient records',
    } as const,

    GET: {
        code: 'patient:get',
        name: 'Get Patient',
        description: 'Get a patient record',
    } as const,

    UPDATE: {
        code: 'patient:update',
        name: 'Update Patient',
        description: 'Update patient records',
    } as const,
};
