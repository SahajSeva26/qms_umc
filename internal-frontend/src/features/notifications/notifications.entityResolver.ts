import { FiBox, FiUsers, FiFolder } from 'react-icons/fi'
import type { IconType } from 'react-icons'
import { isPharmaRoleType, PHARMA_FIELD_ROLE_TYPE_CODES } from '@/lib/access/pharmaAccess'
import { PROJECTS_VIEW_PERMISSIONS } from '@/lib/access/projectAccess'
import { CAMP_VIEW_PERMISSIONS } from '@/lib/access/campAccess'
import { CRM_ROUTES } from '@/features/crm/crm.paths'
import { PROJECTS_ROUTES } from '@/features/projects/projects.paths'
import type { NotificationEntity } from '@/features/notifications/notifications.types'

interface EntityResolution {
  icon: IconType
  label: string
  href: (id: string) => string
}

// Whitelist only — never build a nav path from entity.type (free-text backend string).
const ENTITY_RESOLVERS: Record<string, EntityResolution> = {
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
}

// /projects is gated to project:search/project:manage/tenant:manage
// (PROJECTS_VIEW_PERMISSIONS — the exact list the route itself enforces) — a
// camp coordinator holds none of those, so a project.update notification
// sent to an assigned coordinator would otherwise deep-link them straight
// into /unauthorized. Checked against the real permission contract (not a
// role-type blocklist) so this stays correct for custom roles and future
// permission changes without its own upkeep.
function canReachProjects(hasAnyPermission?: (codes: string[]) => boolean): boolean {
  if (!hasAnyPermission) return true
  return hasAnyPermission(PROJECTS_VIEW_PERMISSIONS)
}

// /camps is gated to CAMP_VIEW_PERMISSIONS (camps.routes.tsx's own guard) — a field-force session
// without camp:book (a real, supported state; its sidebar link correctly disables) would otherwise
// still get a clickable camp notification that 403s straight into /unauthorized.
function canReachCamps(hasAnyPermission?: (codes: string[]) => boolean): boolean {
  if (!hasAnyPermission) return true
  return hasAnyPermission(CAMP_VIEW_PERMISSIONS)
}

export function resolveNotificationEntity(
  entity: NotificationEntity | null,
  roleTypeCode?: string | null,
  hasAnyPermission?: (codes: string[]) => boolean,
): EntityResolution | null {
  if (!entity?.type) return null
  const isFieldForce = !!roleTypeCode && PHARMA_FIELD_ROLE_TYPE_CODES.includes(roleTypeCode)
  // Pharma field-force's (MR/ASM/RSM) one exception: they can reach the real Camp Management
  // page (AppLayout.tsx's onFieldExtraPath) for a camp entity specifically — every other pharma
  // role, and every other entity type even for field-force, stays blocked (AppLayout force-
  // redirects them off any non-portal path on identity alone).
  if (isPharmaRoleType(roleTypeCode) && !(isFieldForce && entity.type === 'camp')) return null
  if (entity.type === 'camp' && !canReachCamps(hasAnyPermission)) return null
  if (entity.type === 'project' && !canReachProjects(hasAnyPermission)) return null
  return ENTITY_RESOLVERS[entity.type] ?? null
}
