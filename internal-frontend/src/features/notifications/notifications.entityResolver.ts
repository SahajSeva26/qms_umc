import { FiBox, FiUsers, FiFolder } from 'react-icons/fi'
import { createNotificationEntityResolver } from '@qms/widgets'
import { isPharmaRoleType, PHARMA_FIELD_ROLE_TYPE_CODES } from '@/lib/access/pharmaAccess'
import { PROJECTS_VIEW_PERMISSIONS } from '@/lib/access/projectAccess'
import { CAMP_VIEW_PERMISSIONS } from '@/lib/access/campAccess'
import { CRM_ROUTES } from '@/features/crm/crm.paths'
import { PROJECTS_ROUTES } from '@/features/projects/projects.paths'

// internal-frontend's app-local config for @qms/core's shared entity-resolver factory — this is
// the "app-local adapter" the shared data layer keeps the resolver's PRESENTATION open for.
// Whitelist only — never build a nav path from entity.type (free-text backend string).
export const resolveNotificationEntity = createNotificationEntityResolver({
  resolvers: {
    camp: {
      icon: FiBox,
      label: 'Camp',
      href: (id) => `/camps?camp=${id}`,
    },
    lead: {
      icon: FiUsers,
      label: 'Lead',
      href: (id) => `${CRM_ROUTES.CRM}?lead=${id}`,
    },
    project: {
      icon: FiFolder,
      label: 'Project',
      href: (id) => `${PROJECTS_ROUTES.PROJECTS}?project=${id}`,
    },
  },
  requiredPermissions: {
    // /camps is gated to CAMP_VIEW_PERMISSIONS (camps.routes.tsx's own guard) — a field-force
    // session without camp:book (a real, supported state; its sidebar link correctly disables)
    // would otherwise still get a clickable camp notification that 403s straight into
    // /unauthorized.
    camp: (hasAnyPermission) => hasAnyPermission(CAMP_VIEW_PERMISSIONS),
    // /projects is gated to project:search/project:manage/tenant:manage (PROJECTS_VIEW_PERMISSIONS
    // — the exact list the route itself enforces) — a camp coordinator holds none of those, so a
    // project.update notification sent to an assigned coordinator would otherwise deep-link them
    // straight into /unauthorized. Checked against the real permission contract (not a role-type
    // blocklist) so this stays correct for custom roles and future permission changes without its
    // own upkeep. (lead has no permission gate, matching the pre-migration behavior exactly.)
    project: (hasAnyPermission) => hasAnyPermission(PROJECTS_VIEW_PERMISSIONS),
  },
  // Pharma field-force's (MR/ASM/RSM) one exception: they can reach the real Camp Management page
  // (AppLayout.tsx's onFieldExtraPath) for a camp entity specifically — every other pharma role,
  // and every other entity type even for field-force, stays blocked (AppLayout force-redirects
  // them off any non-portal path on identity alone). This gate is internal-frontend-only: it exists
  // because internal-frontend's notification feed is shared across pharma AND non-pharma sessions
  // in one app — pharma-frontend has no equivalent (every session there is already a pharma role).
  extraGate: (entity, roleTypeCode) => {
    const isFieldForce = !!roleTypeCode && PHARMA_FIELD_ROLE_TYPE_CODES.includes(roleTypeCode)
    return !isPharmaRoleType(roleTypeCode) || (isFieldForce && entity.type === 'camp')
  },
})
