// GeoProfile Mapper
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
};
