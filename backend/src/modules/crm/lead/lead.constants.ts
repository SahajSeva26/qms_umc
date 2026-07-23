// Lead Constants

import { ALLOWED_ROLETYPE_CODES } from '../../access-management/role-type/roleType.constants';

export const LEAD_STATUSES = {
    NEW: 'new',
    QUALIFIED: 'qualified',
    PROPOSAL: 'proposal',
    PILOT: 'pilot',
    NEGOTIATION: 'negotiation',
    WON: 'won',
    LOST: 'lost',
} as const;

export const LEAD_PROJECT_TYPES = {
    SCREENING: 'screening',
    DIET: 'diet',
    TELE_DIET: 'tele_diet',
    LAB: 'lab',
    MIXED: 'mixed',
} as const;

//optional
// export const qmsOfferings = [
//   {
//     code: "screening_camps",
//     name: "Screening camps",
//     description: "",
//   },
//   {
//     code: "diet_lifestyle_camps",
//     name: "Diet & lifestyle camps",
//     description: "",
//   },
//   {
//     code: "lab_diagnostic_camps",
//     name: "Lab / diagnostic camps",
//     description: "",
//   },
//   {
//     code: "doctor_engagement_meets",
//     name: "Doctor engagement / meets",
//     description: "",
//   },
//   {
//     code: "hcp_training",
//     name: "HCP training",
//     description: "",
//   },
//   {
//     code: "patient_support_program",
//     name: "Patient support program",
//     description: "",
//   },
//   {
//     code: "real_world_evidence_capture",
//     name: "Real-world evidence capture",
//     description: "",
//   },
//   {
//     code: "digital_reminders_adherence",
//     name: "Digital reminders / adherence",
//     description: "",
//   },
//   {
//     code: "data_analytics_dashboards",
//     name: "Data & analytics dashboards",
//     description: "",
//   },
//   {
//     code: "field_force_mr_support",
//     name: "Field-force / MR support",
//     description: "",
//   },
//   {
//     code: "ad_board_advisory_facilitation",
//     name: "Ad board / advisory facilitation",
//     description: "",
//   },
//   {
//     code: "cme_support",
//     name: "CME support",
//     description: "",
//   },
// ];

// keyed by the stored status VALUE (lowercase) so moveStage can do LEAD_TRANSITION_MAP[lead.status] directly
export const LEAD_TRANSITION_MAP: Record<string, string[]> = {
    [LEAD_STATUSES.NEW]: [LEAD_STATUSES.QUALIFIED],
    [LEAD_STATUSES.QUALIFIED]: [LEAD_STATUSES.PROPOSAL, LEAD_STATUSES.LOST],
    [LEAD_STATUSES.PROPOSAL]: [LEAD_STATUSES.PILOT, LEAD_STATUSES.NEGOTIATION, LEAD_STATUSES.LOST],
    [LEAD_STATUSES.PILOT]: [LEAD_STATUSES.NEGOTIATION, LEAD_STATUSES.WON, LEAD_STATUSES.LOST],
    [LEAD_STATUSES.NEGOTIATION]: [LEAD_STATUSES.WON, LEAD_STATUSES.LOST],
    [LEAD_STATUSES.WON]: [],
    [LEAD_STATUSES.LOST]: [],
};

// ============================================================
// ================= LEAD PERMISSIONS CONSTANTS ===============
// ============================================================
export const LEAD_PERMISSIONS = {
    MANAGE: {
        code: 'lead:manage',
        name: 'Manage Lead',
        description: 'Manage leads (full visibility)',
    } as const,

    SEARCH: {
        code: 'lead:search',
        name: 'Search Lead',
        description: 'View/search own leads only',
    } as const,

    CREATE: {
        code: 'lead:create',
        name: 'Create Lead',
        description: 'Create leads',
    } as const,

    UPDATE: {
        code: 'lead:update',
        name: 'Update Lead',
        description: 'Update leads',
    } as const,

    GET: {
        code: 'lead:get',
        name: 'Get Lead',
        description: 'Get leads',
    } as const,
};

export const LEAD_BUSINESS_ROLE_TYPES = [
    {
        code: ALLOWED_ROLETYPE_CODES.PLATFORM.SALES_REP,
        name: 'Sales Representative',
        description: 'Sales representative — owns and works their own leads',
        permissions: [
            LEAD_PERMISSIONS.SEARCH.code,
            LEAD_PERMISSIONS.CREATE.code,
            LEAD_PERMISSIONS.UPDATE.code,
            LEAD_PERMISSIONS.GET.code,
        ],
    },
    {
        code: ALLOWED_ROLETYPE_CODES.PLATFORM.SALES_HEAD,
        name: 'Sales Head',
        description: 'Sales head — full lead visibility, assigns leads to sales reps',
        permissions: [LEAD_PERMISSIONS.MANAGE.code],
    },
];
