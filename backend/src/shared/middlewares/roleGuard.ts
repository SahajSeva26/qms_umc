import { StatusCodes } from 'http-status-codes';

import { ResponseHandler } from '../utils/responseHandler';
import { throwAppError } from '../utils/error';
import { RequestContext } from '../utils/contextBuilder';
import { PERMISSIONS } from '../env/permissions';

// Role-type gate. Unlike AuthorizeMiddleware (which checks permission CODES), this checks the
// caller's ROLE TYPE code (ctx.role.type.code) against an allow-list — "only these kinds of users
// may reach this route". Must run AFTER AuthMiddleware, which populates ctx.role (with its
// populated `type`) and ctx.permissions.
//
// A system:manage actor always passes — the deliberate god-mode skeleton key, consistent with
// AuthorizeMiddleware and the ctx permission helpers.
export const RoleGuard = (allowedRoleTypeCodes: string[] = []) => {
    return (req: any, res: any, next: any) => {
        try {
            const ctx: RequestContext = req.context;

            // system god-mode bypasses the role-type gate
            if (ctx.permissions.includes(PERMISSIONS.SYSTEM.MANAGE.code)) {
                return next();
            }

            const roleTypeCode: string | undefined = ctx.role?.type?.code;
            if (!roleTypeCode || !allowedRoleTypeCodes.includes(roleTypeCode)) {
                return throwAppError('Forbidden: your role is not allowed to access this resource', StatusCodes.FORBIDDEN);
            }

            return next();
        } catch (error: any) {
            return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
        }
    };
};
