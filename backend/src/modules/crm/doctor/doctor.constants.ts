// Doctor Constants
export const DOCTOR_SPECIALIZATION = {
    CP: 'cp',
    GP: 'gp',
} as const;

export const DOCTOR_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
} as const;

// Fixed radius (meters) for the /doctors/nearest search — doctors have no per-record coverage
// radius (that's an FO concept), so nearest is a simple fixed-radius query. 35 km.
export const DOCTOR_NEAREST_MAX_DISTANCE = 35000;

// ================= DOCTOR PERMISSIONS CONSTANTS ===============

export const DOCTOR_PERMISSIONS = {
    MANAGE: {
        code: 'doctor:manage',
        name: 'Manage Doctor',
        description: 'Manage doctors (full visibility, incl. inactive)',
    } as const,

};
