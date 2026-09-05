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

// ================= GEO PROFILE REPORT CONSTANTS ===============

// Fixed set of actionable report exceptions. Each is a state the module permits but which silently
// breaks allocation, so nothing else surfaces it:
//   • an ACTIVE profile whose coordinates are not a usable [lng, lat] pair can never be matched by
//     findNearest's $geoNear — the worker looks deployable and is permanently unallocatable.
//   • a coverageRadius above GEO_ALLOCATION_MAX_DISTANCE is silently clamped by findNearest, so the
//     configured value does not mean what whoever set it thinks it means.
// Severity: high = blocks allocation now, medium = configuration is misleading.
// The label describes the CONFIGURED value only — it makes no claim about real geographic coverage.
export const GEO_PROFILE_REPORT_EXCEPTIONS = [
    {
        code: 'GEO_ACTIVE_WITHOUT_COORDINATES',
        severity: 'high',
        label: 'Active profiles with no usable coordinates (cannot be allocated to camps)',
    },
    {
        code: 'GEO_COVERAGE_RADIUS_ABOVE_CAP',
        severity: 'medium',
        label: 'Profiles whose configured coverage radius exceeds the allocation distance limit',
    },
] as const;
