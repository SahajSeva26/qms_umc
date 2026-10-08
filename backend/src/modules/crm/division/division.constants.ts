// feeds the sequential division code (div-000001) via the global counter module
export const DIVISION_COUNTER_ENTITY = 'division';

export const DIVISION_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
} as const;

export const DIVISION_THERAPY = {
    CARDIOLOGY: 'cardiology',
    DIABETES: 'diabetes',
    PULMONOLOGY: 'pulmonology',
    ENDOCRINE: 'endocrine',
    ORTHOPEDICS: 'orthopedics',
    GYNAECOLOGY: 'gynaecology',
    NEUROLOGY: 'neurology',
    HEPATOLOGY: 'hepatology',
    NEPHROLOGY: 'nephrology',
    OPHTHALMOLOGY: 'ophthalmology',
    DERMATOLOGY: 'dermatology',
    ONCOLOGY: 'oncology',
    PEDIATRICS: 'pediatrics',
    WELLNESS: 'wellness',
} as const;

// ============================================================
// ==============DIVISION PERMISSIONS CONSTANTS================
// ============================================================
export const DIVISION_PERMISSIONS = {
    MANAGE: { code: 'division:manage', name: 'Manage Division', description: 'Manage divisions' } as const,
};
