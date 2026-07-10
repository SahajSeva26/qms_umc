import { NextFunction } from 'express';

import { ResponseHandler } from '../utils/responseHandler';

import { StatusCodes } from 'http-status-codes';
import { throwAppError } from '../utils/error';
import { RequestContext } from '../utils/contextBuilder';

type permissionRequired = 'AND' | 'OR';

export const AuthorizeMiddleware = (requiredPermission: string[] = [], type: permissionRequired = 'AND') => {
    return (req: any, res: any, next: any) => {
        try {
            const ctx: RequestContext = req.context;

            switch (type) {
                case 'AND': {
                    if (!ctx.hasAllPermissions(requiredPermission)) {
                        return throwAppError('Forbidden: Insufficient permissions', StatusCodes.FORBIDDEN);
                    }
                    next();
                    break;
                }

                case 'OR': {
                    if (!ctx.hasAnyPermissions(requiredPermission)) {
                        return throwAppError('Forbidden: Insufficient permissions', StatusCodes.FORBIDDEN);
                    }
                    next();
                    break;
                }
            }
        } catch (error: any) {
            return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null);
        }
    };
};
