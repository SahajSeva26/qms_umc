import { StatusCodes } from 'http-status-codes';

import { ResponseHandler } from '../utils/responseHandler';
import { TokenHandler } from '../helpers/tokenHelper';
import { RoleService } from '../../modules/access-management/role/role.service';
import { throwAppError } from '../utils/error';

export const AuthMiddleware = async (req: any, res: any, next: any) => {
    try {
        const { accessToken } = req.cookies;
        if (!accessToken) {
            throw throwAppError('Unauthorized', StatusCodes.UNAUTHORIZED);
        }

        const user: any = TokenHandler.verifyAccessToken(accessToken);

        if (!user) {
            throw throwAppError('Unauthorized', StatusCodes.UNAUTHORIZED);
        }

        // get role
        const userRole: any = await RoleService.get(user.role, req.context, { populate: true });
        if (!userRole) {
            throw throwAppError('Role not found', StatusCodes.UNAUTHORIZED);
        }

        // Set context data
        req.context.setUser(user);
        req.context.setRole(userRole);
        req.context.setTenant(userRole.tenant);

        // extract permissions
        const permissions = userRole.permissions || [];
        permissions.push(...(userRole.type?.permissions || []));
        const set = new Set(permissions);
        req.context.setPermissions(Array.from(set));

        next();
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};
