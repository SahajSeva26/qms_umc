// The real permission contract GET /camps enforces (camps.routes.ts's own guard: camp:search OR
// camp:manage OR camp:book OR tenant:manage). Kept here, not in features/camps/camps.routes.tsx,
// so other features (e.g. notifications' entity resolver) can check camp reachability without
// importing that feature's route module.
export const CAMP_VIEW_PERMISSIONS = ['camp:search', 'camp:manage', 'camp:book', 'tenant:manage']
