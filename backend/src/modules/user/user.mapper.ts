import { SYSTEM_PERMISSIONS } from '../../shared/env/permissions';
import { RequestContext } from '../../shared/utils/contextBuilder';
import { USER_GENDERS, USER_STATUS } from './user.constants';

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

    toReportResponse: (report: any) => {
        const statusCounts = new Map((report?.statusCounts || []).map((s: any) => [s._id, s.count]));
        const genderCounts = new Map((report?.genderCounts || []).map((g: any) => [g._id, g.count]));

        return {
            summary: {
                totalUsers: report?.totalUsers?.[0]?.count || 0,
                active: statusCounts.get(USER_STATUS.ACTIVE) || 0,
                inactive: statusCounts.get(USER_STATUS.INACTIVE) || 0,
                suspended: statusCounts.get(USER_STATUS.SUSPENDED) || 0,
                deleted: statusCounts.get(USER_STATUS.DELETED) || 0,
            },
            demographics: {
                gender: {
                    male: genderCounts.get(USER_GENDERS.MALE) || 0,
                    female: genderCounts.get(USER_GENDERS.FEMALE) || 0,
                    other: genderCounts.get(USER_GENDERS.OTHER) || 0,
                    unspecified: genderCounts.get('unspecified') || 0,
                },
            },
            security: {
                lockedAccounts: report?.lockedAccounts?.[0]?.count || 0,
            },
            trends: {
                registrations: {
                    granularity: report?.meta?.granularity,
                    from: report?.meta?.from,
                    to: report?.meta?.to,
                    data: report?.registrationTrend || [],
                },
            },
        };
    },
};
