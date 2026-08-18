import { useDoctors } from '@/features/doctors/hooks/useDoctors'
import { useDivisions } from '@/features/crm/divisions/hooks/useDivisions'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useProjects } from '@/features/projects/hooks/useProjects'
import { campRefId, campRefName } from '@/features/camps/campsReal.utils'
import type { CampPopulatedDivision, CampPopulatedDoctor, CampPopulatedProject, CampPopulatedRole } from '@/types/campReal.types'

type RefValue<T> = T | string | null | undefined

interface UseCampRefNamesOptions {
  doctors?: boolean
  divisions?: boolean
  roles?: boolean
  projects?: boolean
}

// Each fallback table (doctors/divisions/roles/projects) is fetched only if its
// caller opts in via `options` — most callers only need a subset.
export const useCampRefNames = (options: UseCampRefNamesOptions = {}) => {
  const { data: doctorsData } = useDoctors({ limit: '10' }, { enabled: options.doctors ?? false })
  const doctors = doctorsData?.data?.items ?? []

  const { data: divisionsData } = useDivisions({ limit: '10' }, options.divisions ?? false)
  const divisions = divisionsData?.data?.items ?? []

  const { data: rolesData } = useRoles({ limit: '10' }, options.roles ?? false)
  const roles = rolesData?.data?.items ?? []

  const { data: projectsData } = useProjects({ limit: '10' }, options.projects ?? false)
  const projects = projectsData?.data?.items ?? []

  const doctorName = (value: RefValue<CampPopulatedDoctor>) => {
    const populated = campRefName(value)
    if (populated) return populated
    const id = campRefId(value)
    return doctors.find((d) => d.id === id)?.name ?? (id ?? '—')
  }

  const divisionName = (value: RefValue<CampPopulatedDivision>) => {
    const populated = campRefName(value)
    if (populated) return populated
    const id = campRefId(value)
    return divisions.find((d) => d.id === id)?.name ?? (id ?? '—')
  }

  const roleName = (value: RefValue<CampPopulatedRole>) => {
    const populated = campRefName(value)
    if (populated) return populated
    const id = campRefId(value)
    return roles.find((r) => r.id === id)?.name ?? (id ?? '—')
  }

  const projectName = (value: RefValue<CampPopulatedProject>) => {
    const populated = campRefName(value)
    if (populated) return populated
    const id = campRefId(value)
    return projects.find((p) => p.id === id)?.name ?? (id ?? '—')
  }

  return { doctors, divisions, roles, projects, doctorName, divisionName, roleName, projectName }
}
