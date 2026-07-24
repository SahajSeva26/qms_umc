// Project Constants
export const PROJECT_COUNTER_ENTITY = 'project';
export const PROJECT_THERAPY_TYPES = {
    CARDIOLOGY: 'cardiology',
    DIABETES: 'diabetes',
    PULMONOLOGY: 'pulmonology',
    ENDOCRINE: 'endocrine',
    ORTHOPEDICS: 'orthopedics',
    GYNAECOLOGY: 'gynaecology',
    NEUROLOGY: 'neurology',
    HEPATOLOGY: 'hepatology',
    NEPHROLOGY: 'nephrology',
} as const;

export const PROJECT_TYPES = {
    SCREENING_CAMP: 'screening_camp',
    DIET: 'diet',
    TELECONSULTATION_DIET: 'teleconsultation_diet',
    LAB_TEST: 'lab_test',
    MIXED: 'mixed',
} as const;

export const PROJECT_TEST_TYPES = {
    FBS: 'fbs',
    PPBS: 'ppbs',
    RBS: 'rbs',
    BP: 'bp',
    SPO2: 'spo2',
    ECG: 'ecg',
    LIPID: 'lipid',
    HbA1c: 'hba1c',
    SPIRO: 'spiro',
    BCA: 'bca',
} as const;

export const PROJECT_EXECUTION_MODES = {
    PO: 'po',
    AGREEMENT: 'agreement',
    MAIL_CONFIRMATION: 'mail_confirmation',
} as const;

export const PROJECT_GO_LIVE_SCOPE = {
    STATES: 'states',
    CITIES: 'cities',
    PAN: 'pan',
} as const;

export const PAYMENT_TERMS = {
    NET_30: 'net_30',
    NET_60: 'net_60',
    NET_90: 'net_90',
} as const;

export const PROJECT_STATUS = {
    NEW: 'new',
    LIVE: 'live',
    HOLD: 'hold',
    CLOSED: 'closed',
} as const;

export const PROJECT_TRANSITION_MAP: Record<string, string[]> = {
    [PROJECT_STATUS.NEW]: [PROJECT_STATUS.LIVE, PROJECT_STATUS.HOLD, PROJECT_STATUS.CLOSED],
    [PROJECT_STATUS.LIVE]: [PROJECT_STATUS.HOLD, PROJECT_STATUS.CLOSED],
    [PROJECT_STATUS.HOLD]: [PROJECT_STATUS.LIVE, PROJECT_STATUS.CLOSED],
    [PROJECT_STATUS.CLOSED]: [],
};

export const CLIENT_REPORT_CANDANCE_TYPES = {
    WEEKLY: 'weekly',
    HALF_MONTHLY: 'half_monthly',
    MONTHLY: 'monthly',
    QUARTERLY: 'quarterly',
    HALFYEARLY: 'halfyearly',
    YEARLY: 'yearly',
} as const;

export const CLIENT_REPORT_POINTERS = {
    CAMP_EXECUTED: 'camp_executed',
} as const;

// ================= PROJECT PERMISSIONS CONSTANTS ===============

export const PROJECT_PERMISSIONS = {
    MANAGE: {
        code: 'project:manage',
        name: 'Manage Project',
        description: 'Manage projects (full visibility)',
    } as const,

    SEARCH: {
        code: 'project:search',
        name: 'Search Project',
        description: 'View/search own projects only',
    } as const,

    CREATE: {
        code: 'project:create',
        name: 'Create Project',
        description: 'Create projects',
    } as const,

    UPDATE: {
        code: 'project:update',
        name: 'Update Project',
        description: 'Update projects',
    } as const,

    GET: {
        code: 'project:get',
        name: 'Get Project',
        description: 'Get projects',
    } as const,
};
