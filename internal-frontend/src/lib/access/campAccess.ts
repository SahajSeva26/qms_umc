// The real permission contract GET /camps enforces (camps.routes.ts's own guard: camp:search OR
// camp:manage OR camp:book OR tenant:manage). Kept here, not in features/camps/camps.routes.tsx,
// so other features (e.g. notifications' entity resolver) can check camp reachability without
// importing that feature's route module.
export const CAMP_VIEW_PERMISSIONS = ['camp:search', 'camp:manage', 'camp:book', 'tenant:manage']

// Mirrors each camp route's own guard in camps.routes.tsx exactly — kept here (not duplicated)
// so routePolicies.ts's returnTo deep-link validation can't drift from the real route guards.
export const CAMP_WRITE_PERMISSIONS = ['camp:create', 'camp:manage', 'tenant:manage']
export const CAMP_DETAIL_PERMISSIONS = ['camp:get', 'camp:manage', 'camp:book', 'tenant:manage']
export const CAMP_EDIT_PERMISSIONS = ['camp:update', 'camp:manage', 'tenant:manage']
export const CAMP_SCREENING_PERMISSIONS = ['screening:create', 'screening:manage', 'system:manage']
