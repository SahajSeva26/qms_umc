import { useState } from 'react'
import { useEntityQuery } from '@/hooks/useEntityQuery'
import { roleKeys } from '@/features/access-management/role/hooks/useRoles'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import { useRoleTypes } from '@/features/access-management/role-type/hooks/useRoleTypes'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { RoleEntity, SearchRoleQuery } from '@/types/accessManagement.types'
import type { PaginatedResponse } from '@/types/common.types'

const PAGE_SIZE = 10

interface Accumulated {
  key: string
  page: number
  items: RoleEntity[]
  count: number
  consumedResponse: PaginatedResponse<RoleEntity> | undefined
}

const EMPTY_ACCUMULATED = (key: string): Accumulated => ({ key, page: 1, items: [], count: 0, consumedResponse: undefined })

function mergeById(existing: RoleEntity[], incoming: RoleEntity[]): RoleEntity[] {
  const byId = new Map(existing.map((r) => [r.id, r]))
  for (const r of incoming) byId.set(r.id, r)
  return Array.from(byId.values())
}

// Scopes by tenant only, not downline, unlike the pharma portal's useEligibleMrs.
// pharma-mr is customer-tenant-owned, so tenant-scoping is correct here.
// field-officer used to route through this hook too (with an unscoped
// "platform" mode), but eligibility for FO is coverage-radius-based, not
// name-search — CampFoPicker now uses useNearestGeoProfiles instead, so this
// hook is pharma-mr/CampMrPicker-only again.
export const useTenantScopedRolePicker = (
  name: string,
  tenant: string | undefined,
  roleTypeCode: 'pharma-mr',
  enabled: boolean,
) => {
  const debouncedName = useDebouncedValue(name, 300)
  const hasQuery = debouncedName.trim().length > 0
  const [page, setPage] = useState(1)
  const key = `${roleTypeCode}::${debouncedName}::${tenant ?? ''}`
  const [accumulated, setAccumulated] = useState<Accumulated>(() => EMPTY_ACCUMULATED(key))

  const { data: roleTypeData, error: roleTypeError } = useRoleTypes({ code: roleTypeCode, status: 'active', tenant: tenant || undefined }, enabled && !!tenant)
  const roleTypeId = roleTypeData?.data?.items[0]?.id

  if (accumulated.key !== key) {
    setAccumulated(EMPTY_ACCUMULATED(key))
    if (page !== 1) setPage(1)
  }

  const query: SearchRoleQuery = {
    tenant: tenant || undefined,
    type: roleTypeId,
    status: 'active',
    name: debouncedName.trim() || undefined,
    page: String(page),
    limit: String(PAGE_SIZE),
  }

  const { data, isLoading, isFetching, error: roleError, refetch } = useEntityQuery(
    roleKeys,
    (q) => accessManagementService.searchRoles(q),
    query,
    { enabled: enabled && hasQuery && !!tenant && !!roleTypeId },
  )
  // A RoleType-lookup failure must surface too — otherwise the Role query
  // never even fires (gated on !!roleTypeId) and the picker would silently
  // show "no results" instead of the real error.
  const error = roleTypeError || roleError

  if (data && accumulated.key === key && accumulated.consumedResponse !== data) {
    const freshItems = data.data?.items ?? []
    const freshCount = data.data?.count ?? 0
    setAccumulated((prev) => ({
      key,
      page,
      items: page === 1 ? freshItems : mergeById(prev.items, freshItems),
      count: freshCount,
      consumedResponse: data,
    }))
  }

  const isCurrent = accumulated.key === key
  const roles = isCurrent ? accumulated.items : []
  const count = isCurrent ? accumulated.count : 0
  const hasMore = roles.length < count

  return {
    roles,
    count,
    isLoading,
    isFetching,
    error,
    refetch,
    hasMore,
    loadMore: () => setPage((p) => p + 1),
  }
}
