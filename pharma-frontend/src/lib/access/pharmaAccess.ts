// Canonical pharma-external role-type codes. pharma.constants.ts's PHARMA_ROLE_META is keyed
// off this same list. Mirrors internal-frontend's lib/access/pharmaAccess.ts.
export const PHARMA_ROLE_TYPE_CODES = ['pharma-division-head', 'pharma-rsm', 'pharma-asm', 'pharma-mr'] as const

export type PharmaRoleTypeCode = (typeof PHARMA_ROLE_TYPE_CODES)[number]

export function isPharmaRoleType(roleTypeCode: string | undefined | null): roleTypeCode is PharmaRoleTypeCode {
  if (!roleTypeCode) return false
  return (PHARMA_ROLE_TYPE_CODES as readonly string[]).includes(roleTypeCode)
}
