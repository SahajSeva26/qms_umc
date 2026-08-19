import { SYSTEM_PERMISSIONS } from '../../shared/env/permissions';
import { RequestContext } from '../../shared/utils/contextBuilder';
import { USER_GENDERS, USER_REPORT_GRANULARITY, USER_STATUS } from './user.constants';

// enumerates every UTC bucket key between from/to (inclusive), in order, at the given granularity —
// so the trend response never has a silent gap for a period with 0 registrations. Bounded by the
// caller's own from/to range (defaults: 30 days or 12 months), so this is always a small, cheap loop.
const enumeratePeriods = (from: Date, to: Date, granularity: string): string[] => {
    const periods: string[] = [];

    if (granularity === USER_REPORT_GRANULARITY.MONTH) {
        const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
        const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
        while (cursor <= end) {
            periods.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`);
            cursor.setUTCMonth(cursor.getUTCMonth() + 1);
        }
        return periods;
    }

    const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
    const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
    while (cursor <= end) {
        periods.push(cursor.toISOString().slice(0, 10));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return periods;
};

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

    // shapes the $facet aggregation result from UserService.report into a stable, zero-filled
    // dashboard response — every known status/gender bucket is always present, even with 0 users.
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
                    data: (() => {
                        const trendCounts = new Map((report?.registrationTrend || []).map((r: any) => [r._id, r.count]));
                        const periods = enumeratePeriods(report?.meta?.from, report?.meta?.to, report?.meta?.granularity);
                        return periods.map((period) => ({ period, count: trendCounts.get(period) || 0 }));
                    })(),
                },
            },
        };
    },
};
