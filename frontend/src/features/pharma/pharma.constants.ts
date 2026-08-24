export const PHARMA_ROUTES = {
  PHARMA:              '/pharma',
  PHARMA_HO:            '/pharma/ho',
  PHARMA_RSM:           '/pharma/rsm',
  PHARMA_ASM:           '/pharma/asm',
  PHARMA_MR:            '/pharma/mr',
  PHARMA_PROJECT_CAMPS: '/pharma/projects/:id/camps',
}

interface PharmaRoleMeta {
  label: string
  portalPath: string
}

export const PHARMA_ROLE_META: Record<string, PharmaRoleMeta> = {
  'pharma-division-head': { label: 'HO', portalPath: PHARMA_ROUTES.PHARMA_HO },
  'pharma-rsm': { label: 'RSM', portalPath: PHARMA_ROUTES.PHARMA_RSM },
  'pharma-asm': { label: 'ASM', portalPath: PHARMA_ROUTES.PHARMA_ASM },
  'pharma-mr': { label: 'MR', portalPath: PHARMA_ROUTES.PHARMA_MR },
}

export const PHARMA_ROLE_TYPE_CODES = Object.keys(PHARMA_ROLE_META)

/** Safe lookup — an unknown/malformed role-type code resolves to null (treat as non-pharma), never an undefined property access. */
export function getPharmaRoleMeta(code: string | undefined | null): PharmaRoleMeta | null {
  if (!code) return null
  return PHARMA_ROLE_META[code] ?? null
}
