import { isPharmaRoleType, type PharmaRoleTypeCode } from '@/lib/access/pharmaAccess'

export const PHARMA_ROUTES = {
  PHARMA:                          '/pharma',
  PHARMA_HO:                       '/pharma/ho',
  PHARMA_RSM:                      '/pharma/rsm',
  PHARMA_ASM:                      '/pharma/asm',
  PHARMA_MR:                       '/pharma/mr',
  // All camps on the project, every type incl. Lab, unrestricted.
  PHARMA_PROJECT_CAMPS:            '/pharma/projects/:id/camps',
  PHARMA_PROJECT_CAMPS_SCREENING:  '/pharma/projects/:id/camps/screening',
  PHARMA_PROJECT_CAMPS_DIET:       '/pharma/projects/:id/camps/diet',
  // Standalone Camp Dossier page — same content as the drawer's "Open page" deep link.
  PHARMA_CAMP_DOSSIER:             '/pharma/camps/:id',
}

export const campDossierPath = (id: string) => PHARMA_ROUTES.PHARMA_CAMP_DOSSIER.replace(':id', id)

interface PharmaRoleMeta {
  label: string
  portalPath: string
}

// Keyed off the shared PharmaRoleTypeCode union (lib/access/pharmaAccess.ts) so the identity
// list and this feature's own labels/paths can never drift apart into two different sets of codes.
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
