import { USER_PERMISSIONS } from '../../modules/user/user.constants';
import { TENANT_PERMISSIONS } from '../../modules/access-management/tenant/tenant.constants';
import { PERMISSION_GROUP_PERMISSIONS } from '../../modules/access-management/permission-group/permissionGroups.constants';

export const PERMISSIONS = {
    USER: USER_PERMISSIONS,
    TENANT: TENANT_PERMISSIONS,
    PERMISSION_GROUP: PERMISSION_GROUP_PERMISSIONS,
};

// export const PERMISSIONS_ARRAY = [...Object.values(PERMISSIONS).values()].map((p: any) => p.code);

export const PERMISSIONS_ARRAY = Object.values(PERMISSIONS)
    .map((v) => Object.values(v).map((i) => i.code))
    .flat();
