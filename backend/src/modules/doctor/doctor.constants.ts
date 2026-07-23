// Doctor Constants
export const DOCTOR_SPECIALIZATION = {
    CP: 'cp',
    GP: 'gp',
} as const;

export const DOCTOR_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
} as const;

// ================= DOCTOR PERMISSIONS CONSTANTS ===============

export const DOCTOR_PERMISSIONS = {
    MANAGE: {
        code: 'doctor:manage',
        name: 'Manage Doctor',
        description: 'Manage doctors (full visibility, incl. inactive)',
    } as const,

};
