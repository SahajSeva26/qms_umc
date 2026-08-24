import { useMemo } from 'react'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useRoleTypes } from '@/features/access-management/role-type/hooks/useRoleTypes'
import { campRefId, campRefName } from '@/features/camps/campsReal.utils'
import type { CampEntity, CampPopulatedRole } from '@/types/campReal.types'

// MR has its own picker (CampMrPicker.tsx); asm/rsm are server-derived from mr.
// This hook only covers FO, the remaining plain eager dropdown.
export const useCampCandidateRoles = (camp: CampEntity | null) => {
  const { data: foTypeData } = useRoleTypes({ code: 'field-officer', status: 'active' })
  const foTypeId = foTypeData?.data?.items[0]?.id

  const { data: foRoleData } = useRoles({ type: foTypeId, status: 'active', limit: '200' }, !!foTypeId)

  // Merges in the camp's already-assigned role even if it's since gone inactive.
  const withAssigned = (
    list: { id: string; name: string; code: string }[],
    value: CampPopulatedRole | string | null | undefined,
  ) => {
    const byId = new Map(list.map((r) => [r.id, r]))
    const refId = campRefId(value)
    if (refId && !byId.has(refId)) {
      const name = campRefName(value)
      byId.set(refId, { id: refId, name: name ?? refId, code: name ? 'inactive' : 'unavailable' })
    }
    return Array.from(byId.values())
  }
  const foRoles = useMemo(() => withAssigned(foRoleData?.data?.items ?? [], camp?.fo), [foRoleData, camp])
  const roleLabel = (id: string) => foRoles.find((r) => r.id === id)?.name ?? id

  return {
    foRoles,
    roleLabel,
  }
}
