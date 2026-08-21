import { ALLOWED_ROLETYPE_CODES } from '../role-type/roleType.constants';

export const ROLE_STATUSES = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
} as const;

// ========================================================
// ROLE SUPERVISOR TREE
// ========================================================
const { PLATFORM, CUSTOMER } = ALLOWED_ROLETYPE_CODES;
export const ROLE_SUPERVISOR_TREE: any = {
    [PLATFORM.SALES_REP]: [],
    [PLATFORM.SALES_HEAD]: [],

    [PLATFORM.CAMP_COORDINATOR_DIET]: [],
    [PLATFORM.OPERATION_MANAGER_DIET]: [],

    [PLATFORM.CAMP_COORDINATOR_SCREENING]: [],
    [PLATFORM.OPERATION_MANAGER_SCREENING]: [],

    [PLATFORM.FIELD_OFFICER]: [],

    // root of the pharma tree — the division head reports to no one (empty list = no supervisor required)
    [CUSTOMER.PHARMA_DIVISION_HEAD]: [],
    [CUSTOMER.PHARMA_RSM]: [CUSTOMER.PHARMA_DIVISION_HEAD],
    [CUSTOMER.PHARMA_ASM]: [CUSTOMER.PHARMA_RSM],
    [CUSTOMER.PHARMA_MR]: [CUSTOMER.PHARMA_ASM],
};
// pharma field-force role types whose code is auto-generated from the universal pharma-role
// counter when the create payload omits `code` (see RoleService.set). The division head keeps
// its own derived `${division.code}-head` code and is minted through the division flow, so it is
// intentionally NOT in this list.
export const PHARMA_ROLE_COUNTER_ENTITY = 'pharma-role';
export const PHARMA_FIELD_FORCE_TYPE_CODES: string[] = [CUSTOMER.PHARMA_RSM, CUSTOMER.PHARMA_ASM, CUSTOMER.PHARMA_MR];

export const isValidRoleSupervisor = (roleTypeCode: string, supervisorRoleTypeCode: string): boolean => {
    if (!roleTypeCode || !supervisorRoleTypeCode) {
        return false;
    }
    // Check if the roleTypeCode exists in the tree and if the supervisorRoleTypeCode is in its list
    const supervisors = ROLE_SUPERVISOR_TREE[roleTypeCode] || [];
    if (supervisors.length === 0) {
        //no supervisor is required
        return true;
    }
    return supervisors.includes(supervisorRoleTypeCode);
};
// ========================================================
// ROLE PERMISSIONS
// ========================================================
export const ROLE_PERMISSIONS = {
    GET: { code: 'role:get', name: 'Get Role', description: 'Get Role' },
    SEARCH: { code: 'role:search', name: 'Search Role', description: 'Search Role' },
    CREATE: { code: 'role:create', name: 'Create Role', description: 'Create Role' },
    UPDATE: { code: 'role:update', name: 'Update Role', description: 'Update Role' },
    MANAGE: { code: 'role:manage', name: 'Manage Role', description: 'Manage Role' },
} as const;
