import { useMemo, useState } from 'react'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useRoleTypes } from '@/features/access-management/role-type/hooks/useRoleTypes'
import { campRefId, campRefName } from '@/features/camps/campsReal.utils'
import type { CampEntity, CampPopulatedRole } from '@/features/camps/campReal.types'

export const useCampCandidateRoles = (effectiveTenant: string, camp: CampEntity | null) => {
  // mr/asm/rsm lookups are lazy-gated on the dropdown opening; FO stays eager.
  const [mrOpened, setMrOpened] = useState(false)
  const [asmOpened, setAsmOpened] = useState(false)
  const [rsmOpened, setRsmOpened] = useState(false)

  // field-officer is a PLATFORM-side RoleType; pharma-mr/-asm/-rsm are CUSTOMER-side
  // and need `tenant: effectiveTenant` in the lookup to resolve to this camp's tenant.
  const { data: foTypeData } = useRoleTypes({ code: 'field-officer', status: 'active' })
  const { data: mrTypeData } = useRoleTypes(
    { code: 'pharma-mr', status: 'active', tenant: effectiveTenant || undefined },
    mrOpened && !!effectiveTenant,
  )
  const { data: asmTypeData } = useRoleTypes(
    { code: 'pharma-asm', status: 'active', tenant: effectiveTenant || undefined },
    asmOpened && !!effectiveTenant,
  )
  const { data: rsmTypeData } = useRoleTypes(
    { code: 'pharma-rsm', status: 'active', tenant: effectiveTenant || undefined },
    rsmOpened && !!effectiveTenant,
  )
  const foTypeId = foTypeData?.data?.items[0]?.id
  const mrTypeId = mrTypeData?.data?.items[0]?.id
  const asmTypeId = asmTypeData?.data?.items[0]?.id
  const rsmTypeId = rsmTypeData?.data?.items[0]?.id

  const { data: foRoleData } = useRoles({ type: foTypeId, status: 'active', limit: '200' }, !!foTypeId)
  const { data: mrRoleData } = useRoles({ tenant: effectiveTenant, type: mrTypeId, status: 'active', limit: '200' }, !!effectiveTenant && !!mrTypeId)
  const { data: asmRoleData } = useRoles({ tenant: effectiveTenant, type: asmTypeId, status: 'active', limit: '200' }, !!effectiveTenant && !!asmTypeId)
  const { data: rsmRoleData } = useRoles({ tenant: effectiveTenant, type: rsmTypeId, status: 'active', limit: '200' }, !!effectiveTenant && !!rsmTypeId)

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
  const mrRoles = useMemo(() => withAssigned(mrRoleData?.data?.items ?? [], camp?.mr), [mrRoleData, camp])
  const asmRoles = useMemo(() => withAssigned(asmRoleData?.data?.items ?? [], camp?.asm), [asmRoleData, camp])
  const rsmRoles = useMemo(() => withAssigned(rsmRoleData?.data?.items ?? [], camp?.rsm), [rsmRoleData, camp])
  const assignableRoles = useMemo(
    () => [...foRoles, ...mrRoles, ...asmRoles, ...rsmRoles],
    [foRoles, mrRoles, asmRoles, rsmRoles],
  )
  const roleLabel = (id: string) => assignableRoles.find((r) => r.id === id)?.name ?? id

  return {
    foRoles,
    mrRoles,
    asmRoles,
    rsmRoles,
    roleLabel,
    setMrOpened,
    setAsmOpened,
    setRsmOpened,
  }
}
