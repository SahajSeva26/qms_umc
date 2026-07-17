import { StatusCodes } from 'http-status-codes';

import { ResponseHandler } from '../utils/responseHandler';
import { TokenHandler } from '../helpers/tokenHelper';
import { throwAppError } from '../utils/error';
import { RoleModel } from '../../modules/access-management/role/role.model';
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
