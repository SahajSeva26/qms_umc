import { TENANT_TYPE } from '../../modules/access-management/tenant/tenant.constants';
import { PERMISSIONS } from '../env/permissions';
import { throwAppError } from './error';
import logger from './logger';
import { generateUUID } from './strings';

export type ContextUser = {
    _id: string;
    email: string;
    firstName?: string | undefined;
    lastName?: string | undefined;
    role: string;
    tenant: string;
};
export type RequestContext = {
    requestID?: string;
    ipAddress?: string;
    user: ContextUser | null;
    role: any | null;
    tenant: any | null;
    permissions: string[];
    logger: typeof logger;

    // runtime fucntions
    setUser: (user: any) => void;
    setRole: (role: any) => void;
    setTenant: (tenant: any) => void;
    setPermissions: (permissions: string[]) => void;
    hasAnyPermissions: (required: string[]) => boolean;
    hasAllPermissions: (required: string[]) => boolean;
    requirePermissions: (permissions: string[]) => boolean;
    where: () => object;
};

export const buildContext = (req: any, res: any, next: any) => {
    const startTime = process.hrtime.bigint();

    res.on('finish', () => {
        const durationMs = (Number(process.hrtime.bigint() - startTime) / 1e6).toFixed(2);
        const requestID = req.context?.requestID ?? '?';
        logger.info(
            `[HTTP] ${req.method} ${req.originalUrl} | status:${res.statusCode} | duration:${durationMs}ms | req:#${requestID}`,
        );
    });

    const context: RequestContext = {
        requestID: generateUUID(),
        ipAddress: req.socket.remoteAddress || 'unknown',
        user: req.user || null,
        role: req.role || null,
        tenant: req.tenant || null,
        permissions: req.permissions || [],
        logger: logger,

        // runtime funcitons
        setUser: (userData: any) => {
            const user: ContextUser = {
                _id: userData._id,
                email: userData.email,
                firstName: userData.firstName,
                lastName: userData.lastName,
                role: userData.role,
                tenant: userData.tenant,
            };
            req.context.user = user;
            req.context.role = userData.role;
            req.context.tenant = userData.tenant;
        },
        setRole: (role: any) => {
            req.context.role = role;
        },
        setTenant: (tenant: any) => {
            req.context.tenant = tenant;
        },
        setPermissions(permissions: string[]) {
            // later: validate, log, merge with role defaults
            // req.context.logger.info('permissions attached to context', { count: permissions.length });
            req.context.permissions = permissions;
        },

        // either of any provided permissions
        hasAnyPermissions(required: string[]) {
            // if user has system-manage permission, return true
            if (req.context.permissions.includes(PERMISSIONS.SYSTEM.MANAGE.code)) {
                return true;
            }
            for (const item of required) {
                if (req.context.permissions.includes(item)) {
                    return true;
                }
            }
            return false;
        },

        // must have all provided permissions
        hasAllPermissions(required: string[]) {
            // if user has system-manage permission, return true
            if (req.context.permissions.includes(PERMISSIONS.SYSTEM.MANAGE.code)) {
                return true;
            }
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
            let scope: any = {};
            switch (this.tenant.type) {
                case TENANT_TYPE.PLATFORM: {
                    // No tenant filter for system
                    break;
                }

                case TENANT_TYPE.CUSTOMER: {
                    // Filter by customer tenant
                    scope.tenant = this.tenant._id || this.tenant.id;
                    break;
                }

                default: {
                    throwAppError('Invalid tenant type', 500);
                    break;
                }
            }

            return scope;
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

const buildWhere = (context: RequestContext) => {};
