import { isPharmaRoleType, type PharmaRoleTypeCode } from '@/lib/access/pharmaAccess'

export const PHARMA_ROUTES = {
  PHARMA_HO: '/pharma/ho',
  PHARMA_RSM: '/pharma/rsm',
  PHARMA_ASM: '/pharma/asm',
  PHARMA_MR: '/pharma/mr',
  // Standalone Camp Dossier page — same content as the drawer's "Open page" deep link.
  PHARMA_CAMP_DOSSIER: '/pharma/camps/:id',
}

export const campDossierPath = (id: string) => PHARMA_ROUTES.PHARMA_CAMP_DOSSIER.replace(':id', id)

interface PharmaRoleMeta {
  label: string
  portalPath: string
}

// Keyed off the shared PharmaRoleTypeCode union so this can't drift from the identity list.
// All four roles have a real portal page — PharmaRoleGate blocks any role from the wrong path.
export const PHARMA_ROLE_META: Record<PharmaRoleTypeCode, PharmaRoleMeta> = {
  'pharma-division-head': { label: 'HO', portalPath: PHARMA_ROUTES.PHARMA_HO },
  'pharma-rsm': { label: 'RSM', portalPath: PHARMA_ROUTES.PHARMA_RSM },
  'pharma-asm': { label: 'ASM', portalPath: PHARMA_ROUTES.PHARMA_ASM },
  'pharma-mr': { label: 'MR', portalPath: PHARMA_ROUTES.PHARMA_MR },
}

/** Safe lookup — an unknown/malformed role-type code resolves to null (treat as non-pharma), never an undefined property access. */
export function getPharmaRoleMeta(code: string | undefined | null): PharmaRoleMeta | null {
  if (!isPharmaRoleType(code)) return null
  return PHARMA_ROLE_META[code]
}
