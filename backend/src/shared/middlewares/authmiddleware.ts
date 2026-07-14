import { StatusCodes } from 'http-status-codes';

import { ResponseHandler } from '../utils/responseHandler';
import { TokenHandler } from '../helpers/tokenHelper';
import { RoleService } from '../../modules/access-management/role/role.service';
import { throwAppError } from '../utils/error';
import { RoleModel } from '../../modules/access-management/role/role.model';
import { decode, JwtPayload } from 'jsonwebtoken';

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
        // const userRole: any = await RoleService.get(user.role, req.context, { populate: true });
        const userRole: any = await RoleModel.findById(user.role).populate(['tenant', 'type']);
        if (!userRole) {
            throw throwAppError('Role not found', StatusCodes.UNAUTHORIZED);
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
        req.context.setPermissions([...new Set(permissions)]);

        next();
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
    }
};

const getContextCredentials=async(decode:any)=>{

    // get and set all, roles, tenant, and rolType here
}
