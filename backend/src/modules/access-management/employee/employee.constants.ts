// Employee Constants
// employment type — how the employee is engaged (NOT their system role, which lives on the linked user)
export const EMPLOYEE_TYPES = {
    FULL_TIME: 'full-time',
    PART_TIME: 'part-time',
    CONTRACTUAL: 'contractual',
    FREELANCE: 'freelance',
} as const;

export const EMPLOYEE_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    TERMINATED: 'terminated',
} as const;

export const EMPLOYEE_GENDER = {
    MALE: 'male',
    FEMALE: 'female',
    OTHER: 'other',
} as const;

// how an employee's dearness/daily allowance is computed off their salary
export const DA_RULE_TYPES = {
    FIXED: 'fixed', // a flat rupee amount
    PERCENTAGE: 'percentage', // a percent of salary
} as const;

export const EMPLOYEE_DEPARTMENTS = {
    MARKETING: 'marketing',
    PURCHASE: 'purchase',
    ACCOUNT: 'account',
    LOGISTIC: 'logistic',
} as const;

// generic ladder shared by the non-marketing departments
const GENERIC_DESIGNATIONS = [
    { key: 'executive', name:'Executive' },
    { key: 'manager', name:'Manager' },
    { key: 'head', name:'Head' },
    { key: 'other', name:'Other' },
] as const;

// department → designations valid for it (key = stored value, name = UI label)
export const DESIGNATIONS_BY_DEPARTMENT = {
    [EMPLOYEE_DEPARTMENTS.MARKETING]: [
        { key: 'jrpmt', name:'Jr PMT' },
        { key: 'pmt', name:'PMT' },
        { key: 'sr.pmt', name:'Sr.PMT' },
        { key: 'gpm', name:'GPM' },
        { key: 'sr.gpm', name:'Sr.GPM' },
        { key: 'marketingmanager', name:'Marketing Manager' },
        { key: 'divisionhead', name:'Division Head' },
        { key: 'buhead', name:'BU Head' },
        { key: 'gm', name:'GM' },
        { key: 'sr.gm', name:'Sr.GM' },
        { key: 'vp', name:'VP' },
        { key: 'sr.vp', name:'Sr.VP' },
        { key: 'president', name:'President' },
        { key: 'other', name:'Other' },
    ],
    [EMPLOYEE_DEPARTMENTS.PURCHASE]: GENERIC_DESIGNATIONS,
    [EMPLOYEE_DEPARTMENTS.ACCOUNT]: GENERIC_DESIGNATIONS,
    [EMPLOYEE_DEPARTMENTS.LOGISTIC]: GENERIC_DESIGNATIONS,
} as const;

// ========================================================
// EMPLOYEE PERMISSIONS
// ========================================================
// NOTE: employee routes are gated by ROLE TYPE (RoleGuard) rather than by these permission codes.
// They are registered for convention/parity with the other modules and are reserved for a future
// switch to permission-based gating.
export const EMPLOYEE_PERMISSIONS = {
    GET: { code: 'employee:get', name: 'Get Employee', description: 'Get Employee' },
    SEARCH: { code: 'employee:search', name: 'Search Employee', description: 'Search Employee' },
    CREATE: { code: 'employee:create', name: 'Create Employee', description: 'Create Employee' },
    UPDATE: { code: 'employee:update', name: 'Update Employee', description: 'Update Employee' },
    MANAGE: { code: 'employee:manage', name: 'Manage Employee', description: 'Manage Employee' },
} as const;
