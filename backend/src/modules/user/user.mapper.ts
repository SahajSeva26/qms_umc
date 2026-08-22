import { SYSTEM_PERMISSIONS } from '../../shared/env/permissions';
import { RequestContext } from '../../shared/utils/contextBuilder';
import { USER_PERMISSIONS } from './user.constants';

export const UserMapper = {
    toResponse: (user: any, ctx: RequestContext) => {
        let result: any = {
            id: user?._id?.toString(),
            email: user?.email,
            firstName: user?.firstName,
            lastName: user?.lastName,
            avatar: user?.avatar,
        };

        // for admin, and superior role add permissions
        if (ctx.hasAllPermissions([SYSTEM_PERMISSIONS.MANAGE.code])) {
            result.phone = user?.phone;
            result.status = user?.status;
            result.gender = user?.gender;
            result.loginAttempts = user?.loginAttempts;
            result.lockUntil = user?.lockUntil;
            result.meta = user?.meta;
            result.createdAt = user?.createdAt;
        }

        return result;
    },

    toSearchResponse: (data: any, ctx: RequestContext) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const u of data?.items || []) {
            result.items.push(UserMapper.toResponse(u, ctx));
        }
        return result;
    },
};
