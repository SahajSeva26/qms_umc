import { useMemo } from 'react'
import { useEntityQuery } from '@/hooks/useEntityQuery'
import { roleKeys } from '@/features/access-management/role/hooks/useRoles'
import { roleTypeKeys } from '@/features/access-management/role-type/hooks/useRoleTypes'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import type { SearchRoleQuery, SearchRoleTypeQuery } from '@/types/accessManagement.types'

export type FieldStaffKind = 'fo' | 'dietitian'

export interface FieldStaffRole {
  role: string
  name: string
  code: string
  kind: FieldStaffKind
}

const ROSTER_FETCH_LIMIT = '1000'

// GET /inventory-assignments/report only aggregates field officers (backend gap) — this resolves
// the FO+dietitian roster directly via role-type → roles, reusing their own query-key factories.
export const useFieldStaffRoster = (enabled = true) => {
  const foTypeQuery: SearchRoleTypeQuery = { code: 'field-officer', status: 'active' }
  const dtTypeQuery: SearchRoleTypeQuery = { code: 'dietitian', status: 'active' }

  const { data: foTypeData, isLoading: foTypeLoading, isError: foTypeErrored, refetch: refetchFoType } = useEntityQuery(
    roleTypeKeys, (q) => accessManagementService.searchRoleTypes(q), foTypeQuery, { enabled },
  )
  const { data: dtTypeData, isLoading: dtTypeLoading, isError: dtTypeErrored, refetch: refetchDtType } = useEntityQuery(
    roleTypeKeys, (q) => accessManagementService.searchRoleTypes(q), dtTypeQuery, { enabled },
  )
  const foTypeId = foTypeData?.data?.items[0]?.id
  const dtTypeId = dtTypeData?.data?.items[0]?.id

  const foRoleQuery: SearchRoleQuery = { type: foTypeId, status: 'active', limit: ROSTER_FETCH_LIMIT }
  const dtRoleQuery: SearchRoleQuery = { type: dtTypeId, status: 'active', limit: ROSTER_FETCH_LIMIT }

  const { data: foRoleData, isLoading: foRolesLoading, isError: foRolesErrored, refetch: refetchFoRoles } = useEntityQuery(
    roleKeys, (q) => accessManagementService.searchRoles(q), foRoleQuery, { enabled: enabled && !!foTypeId },
  )
  const { data: dtRoleData, isLoading: dtRolesLoading, isError: dtRolesErrored, refetch: refetchDtRoles } = useEntityQuery(
    roleKeys, (q) => accessManagementService.searchRoles(q), dtRoleQuery, { enabled: enabled && !!dtTypeId },
  )

  const roster = useMemo<FieldStaffRole[]>(() => {
    const fo = (foRoleData?.data?.items ?? []).map((r) => ({ role: r.id, name: r.name, code: r.code, kind: 'fo' as const }))
    const dietitians = (dtRoleData?.data?.items ?? []).map((r) => ({ role: r.id, name: r.name, code: r.code, kind: 'dietitian' as const }))
    return [...fo, ...dietitians]
  }, [foRoleData, dtRoleData])

  // Capped fetch (ROSTER_FETCH_LIMIT), not real pagination — past the cap, staff silently disappear
  // from both the chip grid and the assign-picker unless the caller surfaces this.
  const isTruncated =
    (foRoleData?.data?.items.length ?? 0) < (foRoleData?.data?.count ?? 0) ||
    (dtRoleData?.data?.items.length ?? 0) < (dtRoleData?.data?.count ?? 0)

  // Role queries only manually refetch once their role-type id is known — react-query's refetch()
  // bypasses `enabled`, so calling it earlier would fire an unscoped `type: undefined` role search.
  const refetch = () => {
    refetchFoType()
    refetchDtType()
    if (foTypeId) refetchFoRoles()
    if (dtTypeId) refetchDtRoles()
  }

  return {
    roster,
    isLoading: foTypeLoading || dtTypeLoading || foRolesLoading || dtRolesLoading,
    isError: foTypeErrored || dtTypeErrored || foRolesErrored || dtRolesErrored,
    isTruncated,
    refetch,
  }
}
