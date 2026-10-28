import { allowedCampTypesForProjectTypes } from '@/types/project.types'
import type { ProjectEntity } from '@/types/project.types'
import { PHARMA_ROUTES } from '@/features/pharma/pharma.constants'

// Only Screening/Diet have dedicated pages — Lab surfaces only via "All camps".
export type PreferredPharmaCampType = 'screening' | 'diet'

// Priority: preferred type if allowed, else Screening, else Diet, else "All camps" — never an empty type-scoped page.
export function resolveProjectCampsRoute(project: ProjectEntity, preferredType?: PreferredPharmaCampType | null): string {
  const allowed = allowedCampTypesForProjectTypes(project.type)
  const type = (preferredType && allowed.includes(preferredType) ? preferredType : null)
    ?? (allowed.includes('screening') ? 'screening' : null)
    ?? (allowed.includes('diet') ? 'diet' : null)

  const route = type === 'screening'
    ? PHARMA_ROUTES.PHARMA_PROJECT_CAMPS_SCREENING
    : type === 'diet'
      ? PHARMA_ROUTES.PHARMA_PROJECT_CAMPS_DIET
      : PHARMA_ROUTES.PHARMA_PROJECT_CAMPS

  return route.replace(':id', project.id)
}
