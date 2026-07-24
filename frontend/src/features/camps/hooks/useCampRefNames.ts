import { useDoctors } from '@/features/doctors/hooks/useDoctors'
import { useDivisions } from '@/features/crm/hooks/useDivisions'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useProjects } from '@/features/projects/hooks/useProjects'
import { campRefId, campRefName } from '@/features/camps/campsReal.utils'
import type { CampPopulatedDivision, CampPopulatedDoctor, CampPopulatedProject, CampPopulatedRole } from '@/types/campReal.types'

type RefValue<T> = T | string | null | undefined

// CampMapper's link fields are a populated-object-or-bare-string union
// depending on which endpoint returned them (see campReal.types.ts) — this
// hook first reads a populated object's own `.name` directly (no lookup
// needed), and only falls back to a batch-fetched id->name table when the
// value is a bare id string (create/update/moveStage/allocate responses).
export const useCampRefNames = () => {
  const { data: doctorsData } = useDoctors({ limit: '1000' })
  const doctors = doctorsData?.data?.items ?? []

  const { data: divisionsData } = useDivisions({ limit: '1000' })
  const divisions = divisionsData?.data?.items ?? []

  const { data: rolesData } = useRoles({ limit: '1000' })
  const roles = rolesData?.data?.items ?? []

  const { data: projectsData } = useProjects({ limit: '1000' })
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
