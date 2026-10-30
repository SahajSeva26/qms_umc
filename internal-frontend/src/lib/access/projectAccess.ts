// The real permission contract GET /projects enforces (project.routes.ts's READ_GUARD:
// project:search OR project:manage OR tenant:manage). Kept here, not in
// features/projects/projects.routes.tsx, so other features (e.g. notifications' entity
// resolver) can check project reachability without importing that feature's route module.
export const PROJECTS_VIEW_PERMISSIONS = ['project:search', 'project:manage', 'tenant:manage']
