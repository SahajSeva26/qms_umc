import { useMemo } from 'react'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useRoleTypes } from '@/features/access-management/role-type/hooks/useRoleTypes'

// Two-step lookup: resolve 'field-officer' -> its RoleType id, then list
// active Roles of that type — the only RoleType inventory-assignment's `assignee` accepts.
export const useFieldOfficerRoles = (enabled = true) => {
  const { data: foTypeData } = useRoleTypes({ code: 'field-officer', status: 'active' }, enabled)
  const foTypeId = foTypeData?.data?.items[0]?.id

  const { data: foRoleData, isFetching } = useRoles({ type: foTypeId, status: 'active', limit: '200' }, enabled && !!foTypeId)
  const roles = useMemo(() => foRoleData?.data?.items ?? [], [foRoleData])

  const roleLabel = (id: string) => {
    const role = roles.find((r) => r.id === id)
    return role ? `${role.name} (${role.code})` : id
  }

  return { roles, roleLabel, isFetching }
}
