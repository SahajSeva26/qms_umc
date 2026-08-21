import { useMemo } from 'react'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useRoleTypes } from '@/features/access-management/role-type/hooks/useRoleTypes'

// Two-step lookup, modeled on useCampCandidateRoles.ts's own shape but
// scoped to just the one RoleType inventory-assignment's `assignee` field
// requires server-side: resolve 'field-officer' -> its RoleType id, then
// list active Roles of that type. Used by the Assignments panel's Field
// Officer filter — inventory-request has no equivalent restriction (the
// requester is always the acting session's own role, never a picked one).
// `enabled` lets the caller withhold this until the viewer actually holds tenant:manage/tenant:admin.
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
