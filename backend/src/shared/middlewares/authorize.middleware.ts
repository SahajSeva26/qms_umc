import { StatusCodes } from 'http-status-codes';

import { ResponseHandler } from '../utils/responseHandler';
import { RequestContext } from '../utils/contextBuilder';

// Authorization guards — each method takes the required roles/permissions and RETURNS an Express
// middleware. Use AFTER AuthMiddleware (which populates ctx.role + ctx.permissions). All three
// delegate to the ctx helpers, so system:manage god-mode bypass is preserved.
class AuthorizeGuard {
    // allow only if the caller's role-type code is one of `roles`
    roles(roles: string[]) {
        return (req: any, res: any, next: any) => {
            try {
                const ctx: RequestContext = req.context;
                if (!ctx.hasRole(roles)) {
                    return ResponseHandler.appResponse(res, StatusCodes.FORBIDDEN, false, 'Forbidden: insufficient role', null);
                }
                return next();
            } catch (error: any) {
                return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
            }
        };
    }

    // allow only if the caller has EVERY one of `permissions`
    allPermissions(permissions: string[]) {
        return (req: any, res: any, next: any) => {
            try {
                const ctx: RequestContext = req.context;
                if (!ctx.hasAllPermissions(permissions)) {
                    return ResponseHandler.appResponse(res, StatusCodes.FORBIDDEN, false, 'Forbidden: missing permission', null);
                }
                return next();
            } catch (error: any) {
                return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
            }
        };
    }

    // allow if the caller has AT LEAST ONE of `permissions`
    anyPermissions(permissions: string[]) {
        return (req: any, res: any, next: any) => {
            try {
                const ctx: RequestContext = req.context;
                if (!ctx.hasAnyPermissions(permissions)) {
                    return ResponseHandler.appResponse(res, StatusCodes.FORBIDDEN, false, 'Forbidden: missing permission', null);
                }
                return next();
            } catch (error: any) {
                return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
            }
        };
    }
}

export const Authorize = new AuthorizeGuard();
