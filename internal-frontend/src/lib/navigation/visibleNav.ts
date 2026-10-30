import { FULL_NAV_SECTIONS, type NavItem } from '@/lib/navigation/navRegistry'
import { isPharmaRoleType, PHARMA_FIELD_ROLE_TYPE_CODES } from '@/lib/access/pharmaAccess'
import { canReadEmployees } from '@/lib/access/employeeAccess'

// Single source of truth for "which sidebar item can this session reach" — shared by Sidebar.tsx
// and the post-login resolver so the two consumers can't drift apart. 'camps' includes camp:book, the permission an MR holds.
const REAL_GATED_NAV_ITEMS: Record<string, string[]> = {
  // Deliberately system:manage-only (not tenant:manage, which the platform tenant's own "admin"
  // role type also holds) — scoped to exactly the seeded system account, per explicit request.
  dashboard: ['system:manage'],
  analytics: ['system:manage'],
  foanalytics: ['system:manage'],
  docanalytics: ['system:manage'],
  finanalytics: ['system:manage'],
  crminvoicing: ['invoice:search', 'invoice:manage', 'tenant:manage'],
  crm: ['lead:search', 'lead:manage', 'tenant:manage'],
  tenants: ['tenant:get', 'tenant:search', 'tenant:manage'],
  permissiongroups: ['permission-group:get', 'permission-group:search', 'tenant:admin'],
  roletypes: ['tenant:manage', 'tenant:admin'],
  roles: ['tenant:admin', 'tenant:manage', 'role:get', 'role:search'],
  qafeedback: ['qa-feedback:manage'],
  appointments: ['appointment:search', 'appointment:manage', 'tenant:manage'],
  projects: ['project:search', 'project:manage', 'tenant:manage'],
  gantt: ['project:search', 'project:manage', 'tenant:manage'],
  camps: ['camp:search', 'camp:manage', 'camp:book', 'tenant:manage'],
  campsscreening: ['camp:search', 'camp:manage', 'tenant:manage'],
  // Also includes camp:book (unlike campsscreening) — the pharma field-force's (MR/ASM/RSM) own
  // extra-item allowlist below needs this page reachable, same backend GET /camps call as 'camps'.
  campsdiet: ['camp:search', 'camp:manage', 'camp:book', 'tenant:manage'],
  fieldofficers: ['tenant:manage', 'tenant:admin'],
  users: ['user:get', 'user:search', 'user:update'],
  // No entry for 'geoprofiles' — GET /geo-profiles, /:id, /nearest are all open to any authenticated
  // user server-side (geoProfile.routes.ts), same as 'doctors'; gating it here would be stricter
  // than the backend actually requires.
}

// MR/ASM/RSM's exceptions to "pharma sees only the Pharma Portal section" — real pages own-scoped
// server-side (camp:book is held by all three; doctor reads are open to any authenticated user).
// 'campsdiet' is the same GET /camps call as 'camps', pre-filtered to type=diet.
const PHARMA_FIELD_EXTRA_NAV_ITEM_IDS = ['camps', 'campsdiet', 'doctors']

export interface VisibleNavSession {
  isSettled: boolean
  permissions: string[]
  roleTypeCode: string | undefined
  tenantType: string | undefined
}

/** True when the session holds `system:manage` — mirrors backend authorizeMiddleware's bypass-all. */
function isRealSystemManage(session: VisibleNavSession): boolean {
  return session.isSettled && session.permissions.includes('system:manage')
}

/** Whether the nav item is reachable at all — the gate Sidebar.tsx renders from and AuthContinuePage resolves against. */
export function isNavItemVisible(item: NavItem, session: VisibleNavSession): boolean {
  if (item.id === 'pharma') return isPharmaRoleType(session.roleTypeCode)
  if (item.id === 'employees') return session.isSettled && canReadEmployees(session.roleTypeCode, session.permissions)
  // Role-type-only, deliberately NOT permission-gated and NOT system:manage-bypassed — exactly
  // sales-head/sales-rep, per explicit request (not visible to admin/system even though they hold
  // tenant:manage/system:manage).
  if (item.id === 'salesdashboard') return session.isSettled && (session.roleTypeCode === 'sales-head' || session.roleTypeCode === 'sales-rep')
  const requiredCodes = REAL_GATED_NAV_ITEMS[item.id]
  if (!requiredCodes) return true
  if (!session.isSettled) return false
  const hasCode = isRealSystemManage(session) || requiredCodes.some((code) => session.permissions.includes(code))
  if (item.id === 'fieldofficers') return hasCode && session.tenantType === 'platform'
  return hasCode
}

/** Whether the item, though visible, is rendered disabled/non-navigable (mirrors Sidebar.tsx's itemOverrides). */
export function isNavItemDisabled(item: NavItem, session: VisibleNavSession): boolean {
  if (item.id !== 'pharma') return false
  return !session.permissions.includes('camp:book')
}

/** True for the non-pharma items a field-force pharma session (MR/ASM/RSM) may still see. */
export function isPharmaExtraNavItem(item: NavItem, session: VisibleNavSession): boolean {
  return !!session.roleTypeCode && PHARMA_FIELD_ROLE_TYPE_CODES.includes(session.roleTypeCode) && PHARMA_FIELD_EXTRA_NAV_ITEM_IDS.includes(item.id)
}

/** Flattened, in display order — same section/sub filters Sidebar.tsx applies before rendering. */
export function getVisibleNavItems(session: VisibleNavSession): NavItem[] {
  const sessionIsPharmaRoleType = isPharmaRoleType(session.roleTypeCode)
  return FULL_NAV_SECTIONS
    .filter((section) => section.section !== 'System' || isRealSystemManage(session))
    .flatMap((section) => section.subs.flatMap((sub) => sub.items))
    // A pharma session sees only its Pharma Portal link plus its own extra-item allowlist (e.g. Camp Management).
    .filter((item) => !sessionIsPharmaRoleType || item.id === 'pharma' || isPharmaExtraNavItem(item, session))
    .filter((item) => isNavItemVisible(item, session))
}

/** First reachable nav path in display order — a pharma session's own portal always wins over any extra item (e.g. Camp Management). */
export function getFirstVisibleNavPath(session: VisibleNavSession): string | null {
  const visible = getVisibleNavItems(session).filter((candidate) => !isNavItemDisabled(candidate, session))
  if (isPharmaRoleType(session.roleTypeCode)) {
    return visible.find((candidate) => candidate.id === 'pharma')?.path ?? visible[0]?.path ?? null
  }
  return visible[0]?.path ?? null
}
