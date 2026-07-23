// GeoProfile Constants

// The two assignable field roles that carry a geo profile. `type` on the profile
// declares which kind of field worker it is, so allocation can filter FO vs Dietitian
// inside the one collection (decoupled from role-type).
export const GEO_PROFILE_TYPES = {
    FO: 'fo',
    DIETITIAN: 'dietitian',
} as const;

// allocation availability of the field worker — distinct from the linked Role's login/auth
// status. `inactive` = not assignable to camps (on leave / retired) and also serves as the
// soft-delete since there is no DELETE endpoint. findNearest never allocates an inactive profile.
export const GEO_PROFILE_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
} as const;

// Hard outer cap (meters) for the allocation search. Even a mis-configured coverageRadius cannot
// pull in a field worker from beyond this distance — a safety net over the per-profile radius. 100 km.
export const GEO_ALLOCATION_MAX_DISTANCE = 100000;

// ================= GEO PROFILE PERMISSIONS CONSTANTS ===============

export const GEO_PROFILE_PERMISSIONS = {
    MANAGE: {
        code: 'geo-profile:manage',
        name: 'Manage Geo Profile',
        description: 'Manage geo profiles (field-staff location + coverage used for camp allocation)',
    } as const,
};
