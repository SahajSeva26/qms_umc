import { USER_PERMISSIONS } from '../../modules/user/user.constants';
import { TENANT_PERMISSIONS } from '../../modules/access-management/tenant/tenant.constants';
import { PERMISSION_GROUP_PERMISSIONS } from '../../modules/access-management/permission-group/permissionGroup.constants';
import { ROLE_TYPE_PERMISSIONS } from '../../modules/access-management/role-type/roleType.constants';
import { ROLE_PERMISSIONS } from '../../modules/access-management/role/role.constants';
import { DIVISION_PERMISSIONS } from '../../modules/crm/division/division.constants';

export const SYSTEM_PERMISSIONS = {
    MANAGE: {
        code: 'system:manage',
        name: 'Manage System',
        description: 'Manage system',
    },
};
export const PERMISSIONS = {
    SYSTEM: SYSTEM_PERMISSIONS,
    USER: USER_PERMISSIONS,
    TENANT: TENANT_PERMISSIONS,
    PERMISSION_GROUP: PERMISSION_GROUP_PERMISSIONS,
    ROLE_TYPE: ROLE_TYPE_PERMISSIONS,
    ROLE: ROLE_PERMISSIONS,
    DIVISION: DIVISION_PERMISSIONS,
};

export const PERMISSIONS_ARRAY = Object.values(PERMISSIONS)
    .map((v) => Object.values(v).map((i) => i.code))
    .flat();
