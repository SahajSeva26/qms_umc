// Canonical pharma-external role-type codes, shared by AppLayout, Sidebar, navigation, and
// notifications. pharma.constants.ts's PHARMA_ROLE_META is keyed off this same list.
export const PHARMA_ROLE_TYPE_CODES = ['pharma-division-head', 'pharma-rsm', 'pharma-asm', 'pharma-mr'] as const

export type PharmaRoleTypeCode = (typeof PHARMA_ROLE_TYPE_CODES)[number]

export function isPharmaRoleType(roleTypeCode: string | undefined | null): roleTypeCode is PharmaRoleTypeCode {
  if (!roleTypeCode) return false
  return (PHARMA_ROLE_TYPE_CODES as readonly string[]).includes(roleTypeCode)
}

// The pharma field-force (not pharma-division-head) — these three get the same non-pharma-portal
// exceptions: Camp Management + Doctor Management in the sidebar (visibleNav.ts), the matching
// route guard (AppLayout.tsx), and clickable camp notifications (notifications.entityResolver.ts).
export const PHARMA_FIELD_ROLE_TYPE_CODES = ['pharma-mr', 'pharma-asm', 'pharma-rsm']
