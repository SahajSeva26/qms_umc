import { FiBox, FiUsers, FiFolder } from 'react-icons/fi'
import type { IconType } from 'react-icons'
import { isPharmaRoleType } from '@/lib/access/pharmaAccess'
import { PROJECTS_VIEW_PERMISSIONS } from '@/lib/access/projectAccess'
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

export function resolveNotificationEntity(
  entity: NotificationEntity | null,
  roleTypeCode?: string | null,
  hasAnyPermission?: (codes: string[]) => boolean,
): EntityResolution | null {
  if (!entity?.type) return null
  if (isPharmaRoleType(roleTypeCode)) return null
  if (entity.type === 'project' && !canReachProjects(hasAnyPermission)) return null
  return ENTITY_RESOLVERS[entity.type] ?? null
}
