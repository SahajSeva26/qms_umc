// GeoProfile Mapper
import {
    GEO_ALLOCATION_MAX_DISTANCE,
    GEO_PROFILE_REPORT_EXCEPTIONS,
    GEO_PROFILE_STATUS,
    GEO_PROFILE_TYPES,
} from './geoProfile.constants';
import {
    IGeoProfileReportCountBucket,
    IGeoProfileReportCountOnly,
    IGeoProfileReportResponse,
    IGeoProfileReportServiceResult,
} from './geoProfile.types';

// ========================================================================================
// REPORT HELPERS
// ========================================================================================

const countOf = (branch?: IGeoProfileReportCountOnly[]): number => branch?.[0]?.count || 0;

const toCountMap = (buckets?: IGeoProfileReportCountBucket[]): Map<string | null, number> =>
    new Map((buckets || []).map((b) => [b._id, b.count]));

export const GeoProfileMapper = {
    toResponse: (profile: any) => {
        const result: any = {
            id: profile._id?.toString(),

            // link
            tenant: profile.tenant?._id?.toString?.() || profile.tenant?.toString?.(),
            role: profile.role?._id?.toString?.() || profile.role?.toString?.(),
            type: profile.type,
            status: profile.status,

            // geo
            coordinates: profile.coordinates || [],
            coverageRadius: profile.coverageRadius,

            meta: profile.meta || {},

            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
        };

        // present only on allocation (findNearest) results — distance to the target point, in meters
        if (profile.distance !== undefined) {
            result.distance = profile.distance;
        }

        return result;
    },
    toSearchResponse: (data: { count: number; items: any[] }) => {
        return {
            count: data?.count || 0,
            items: (data?.items || []).map(GeoProfileMapper.toResponse),
        };
    },

    toReportResponse: (report: IGeoProfileReportServiceResult): IGeoProfileReportResponse => {
        const statusCounts = toCountMap(report?.statusCounts);
        const typeCounts = toCountMap(report?.typeCounts);

        const exceptionCounts: Record<string, number> = {
            GEO_ACTIVE_WITHOUT_COORDINATES: countOf(report?.activeWithoutCoordinates),
            GEO_COVERAGE_RADIUS_ABOVE_CAP: countOf(report?.coverageRadiusAboveCap),
        };

        return {
            meta: {
                generatedAt: report.generatedAt.toISOString(),
            },

            summary: {
                totalProfiles: countOf(report?.total),
                activeProfiles: statusCounts.get(GEO_PROFILE_STATUS.ACTIVE) || 0,
                inactiveProfiles: statusCounts.get(GEO_PROFILE_STATUS.INACTIVE) || 0,
            },

            byType: Object.values(GEO_PROFILE_TYPES).map((type) => ({
                type,
                count: typeCounts.get(type) || 0,
            })),
            byStatus: Object.values(GEO_PROFILE_STATUS).map((status) => ({
                status,
                count: statusCounts.get(status) || 0,
            })),

            // fixed set, most-actionable first (declaration order in GEO_PROFILE_REPORT_EXCEPTIONS).
            // The radius label is interpolated with the real cap so the number is self-explaining.
            exceptions: GEO_PROFILE_REPORT_EXCEPTIONS.map((exception) => ({
                code: exception.code,
                severity: exception.severity,
                count: exceptionCounts[exception.code] || 0,
                label:
                    exception.code === 'GEO_COVERAGE_RADIUS_ABOVE_CAP'
                        ? `${exception.label} (${GEO_ALLOCATION_MAX_DISTANCE} m)`
                        : exception.label,
            })),
        };
    },
};
