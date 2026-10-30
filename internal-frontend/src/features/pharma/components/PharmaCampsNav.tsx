import { useNavigate } from 'react-router-dom'
import { PHARMA_ROUTES } from '@/features/pharma/pharma.constants'
import { allowedCampTypesForProjectTypes } from '@/types/project.types'
import type { ProjectEntity } from '@/types/project.types'
import { CAMP_TYPE_LABEL, type CampType } from '@/types/campReal.types'

// Shared cross-navigation for the 3 pharma camps pages (Screening/Diet/All camps) on one project.
interface PharmaCampsNavProps {
  project: ProjectEntity
  // The current page — renders as plain text instead of a click-to-self link.
  active: CampType | 'all'
}

const PharmaCampsNav = ({ project, active }: PharmaCampsNavProps) => {
  const navigate = useNavigate()
  const allowedTypes = allowedCampTypesForProjectTypes(project.type)
  // Lab has no dedicated route (see TODO.md) — never offered here.
  const typeLinks = (['screening', 'diet'] as const).filter((t) => allowedTypes.includes(t))

  const routeFor = (target: CampType | 'all'): string => {
    if (target === 'screening') return PHARMA_ROUTES.PHARMA_PROJECT_CAMPS_SCREENING.replace(':id', project.id)
    if (target === 'diet') return PHARMA_ROUTES.PHARMA_PROJECT_CAMPS_DIET.replace(':id', project.id)
    return PHARMA_ROUTES.PHARMA_PROJECT_CAMPS.replace(':id', project.id)
  }

  const labelFor = (target: CampType | 'all'): string => (target === 'all' ? 'All camps' : CAMP_TYPE_LABEL[target])

  return (
    <div className="flex items-center gap-3 mb-3 text-[12px] font-semibold">
      {[...typeLinks, 'all' as const].map((target) => (
        <span key={target}>
          {active === target ? (
            <span style={{ color: 'var(--qms-text)' }}>{labelFor(target)}</span>
          ) : (
            <button
              type="button"
              onClick={() => navigate(routeFor(target))}
              className="transition-colors hover:opacity-80"
              style={{ color: 'var(--qms-brand)' }}
            >
              {labelFor(target)}
            </button>
          )}
        </span>
      ))}
    </div>
  )
}

export default PharmaCampsNav
