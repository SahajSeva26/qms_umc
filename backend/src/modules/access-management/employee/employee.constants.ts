// Employee Constants
export const EMPLOYEE_TYPES = {
    FIELD_OFFICER: 'field-officer',
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
