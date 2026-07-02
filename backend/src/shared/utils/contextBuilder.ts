import { throwAppError } from './error';
import logger from './logger';
import { generateUUID } from './strings';

type ContextUser = {
    _id: string;
    email: string;
};
export type RequestContext = {
    requestID?: string;
    ipAddress?: string;
    user: ContextUser | null;
    permissions: string[];
    logger: typeof logger;

    // runtime fucntions
    setUser: (user: any) => void;
    setPermissions: (permissions: string[]) => void;
    hasAnyPermissions: (required: string[]) => boolean;
    hasAllPermissions: (required: string[]) => boolean;
    requirePermissions: (permissions: string[]) => boolean;
    where: () => Object;
};

export const buildContext = (req: any, res: any, next: any) => {
    const context: RequestContext = {
        requestID: generateUUID(),
        ipAddress: req.socket.remoteAddress || 'unknown',
        user: req.user,
        permissions: req.permissions,
        logger: logger,

        // runtime funcitons
        setUser: (userData: any) => {
            const user: ContextUser = {
                _id: userData._id,
                email: userData.email,
            };
            req.context.user = user;
        },
        setPermissions(permissions: string[]) {
            // later: validate, log, merge with role defaults
            // req.context.logger.info('permissions attached to context', { count: permissions.length });
            req.context.permissions = permissions;
        },
        // either this OR that
        hasAnyPermissions(required: string[]) {
            for (const item of required) {
                if (req.context.permissions.includes(item)) {
                    return true;
                }
            }
            return false;
        },
        // must have this AND that
        hasAllPermissions(required: string[]) {
            for (const item of required) {
                if (!req.context.permissions.includes(item)) {
                    return false;
                }
            }
            return true;
        },
        // guard
        requirePermissions(perms: string[]) {
            if (!this.hasAllPermissions(perms)) {
                throwAppError('Forbidden', 403);
                return false;
            }
            return true;
        },
        where() {
            return {};
        },
    };
    req.context = context;
    next();
};

declare global {
    namespace Express {
        interface Request {
            context: RequestContext;
        }
    }
}

