import { StatusCodes } from 'http-status-codes';

import { ResponseHandler } from '../utils/responseHandler';
import { TokenHandler } from '../helpers/tokenHelper';
import { throwAppError } from '../utils/error';
import { RoleModel } from '../../modules/access-management/role/role.model';
import { PermissionGroupModel } from '../../modules/access-management/permission-group/permissionGroup.model';
import { PERMISSIONS_ARRAY } from '../env/permissions';

export const AuthMiddleware = async (req: any, res: any, next: any) => {
    try {
        const { accessToken } = req.cookies;
        if (!accessToken) {
            throwAppError('Unauthorized', StatusCodes.UNAUTHORIZED);
        }
        const user: any = TokenHandler.verifyAccessToken(accessToken);

        if (!user) {
            throwAppError('Unauthorized', StatusCodes.UNAUTHORIZED);
        }
        // get role
        const userRole: any = await RoleModel.findById(user.role).populate(['tenant', 'type']);
        if (!userRole) {
            throwAppError('Role not found', StatusCodes.UNAUTHORIZED);
        }

        if (!userRole.tenant) {
            throwAppError('Tenant not found', StatusCodes.UNAUTHORIZED);
        }
        if (!userRole.type) {
            throwAppError('Role type not found', StatusCodes.UNAUTHORIZED);
        }
        if (userRole.tenant.status != 'active') {
            throwAppError('Tenant is not active', StatusCodes.UNAUTHORIZED);
        }
        if (userRole.type.status != 'active') {
            throwAppError('Role type is not active', StatusCodes.UNAUTHORIZED);
        }
        if (userRole.status != 'active') {
            throwAppError('Role is not active', StatusCodes.UNAUTHORIZED);
        }

        // The tenant's permission group is its permission boundary — if it's inactive the tenant
        // is effectively frozen, so block access. Looked up by tenant (one PG per tenant); the PG
        // isn't referenced from the role, hence the extra query.
        const permissionGroup: any = await PermissionGroupModel.findOne({ tenant: userRole.tenant._id });
        if (!permissionGroup || permissionGroup.status != 'active') {
            throwAppError('Permission group is not active', StatusCodes.UNAUTHORIZED);
        }

        // Set context data
        req.context.setUser(user);
        req.context.setRole(userRole);
        req.context.setTenant(userRole.tenant);

        // extract permissions (build a new array — do not mutate the role document)
        const permissions = [
            ...(userRole.type?.permissions || []), // role type permissions
            ...(userRole.permissions || []), // user permissions
        ];
        // Only permissions still present in the registry take effect. A code removed from
        // PERMISSIONS_ARRAY becomes instantly inert everywhere — no data migration needed, and
        // any stale codes left in role/role-type documents are ignored rather than granting access.
        const effectivePermissions = permissions.filter((permission: string) => PERMISSIONS_ARRAY.includes(permission));
        req.context.setPermissions([...new Set(effectivePermissions)]);

        next();
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};
