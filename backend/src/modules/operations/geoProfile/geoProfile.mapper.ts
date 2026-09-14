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

            // address (spread flat; `coordinates` above doubles as the address geo point)
            addressLine1: profile.addressLine1 ?? null,
            addressLine2: profile.addressLine2 ?? null,
            locality: profile.locality ?? null,
            city: profile.city ?? null,
            state: profile.state ?? null,
            country: profile.country ?? null,
            pincode: profile.pincode ?? null,
            googlePlaceId: profile.googlePlaceId ?? null,

            meta: profile.meta || {},

            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
        };

        // present only on allocation (findNearest) results — distance to the target point, in meters
        if (profile.distance !== undefined) {
            result.distance = profile.distance;
        }

        // present only on findNearest when a date + time slot were supplied — is this FO free then
        if (profile.available !== undefined) {
            result.available = profile.available;
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
