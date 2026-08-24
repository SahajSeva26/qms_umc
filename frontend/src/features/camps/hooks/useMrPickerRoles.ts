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

// Debounced, tenant-scoped, server-searched "load more" MR picker for QMS staff.
// Scopes by tenant only, not downline, unlike the pharma portal's useEligibleMrs.
export const useMrPickerRoles = (name: string, tenant: string | undefined, enabled: boolean) => {
  const debouncedName = useDebouncedValue(name, 300)
  const hasQuery = debouncedName.trim().length > 0
  const [page, setPage] = useState(1)
  const key = `${debouncedName}::${tenant ?? ''}`
  const [accumulated, setAccumulated] = useState<Accumulated>(() => EMPTY_ACCUMULATED(key))

  const { data: mrTypeData } = useRoleTypes({ code: 'pharma-mr', status: 'active', tenant: tenant || undefined }, enabled && !!tenant)
  const mrTypeId = mrTypeData?.data?.items[0]?.id

  if (accumulated.key !== key) {
    setAccumulated(EMPTY_ACCUMULATED(key))
    if (page !== 1) setPage(1)
  }

  const query: SearchRoleQuery = {
    tenant: tenant || undefined,
    type: mrTypeId,
    status: 'active',
    name: debouncedName.trim() || undefined,
    page: String(page),
    limit: String(PAGE_SIZE),
  }

  const { data, isLoading, isFetching, error, refetch } = useEntityQuery(
    roleKeys,
    (q) => accessManagementService.searchRoles(q),
    query,
    { enabled: enabled && hasQuery && !!tenant && !!mrTypeId },
  )

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
  const mrs = isCurrent ? accumulated.items : []
  const count = isCurrent ? accumulated.count : 0
  const hasMore = mrs.length < count

  return {
    mrs,
    count,
    isLoading,
    isFetching,
    error,
    refetch,
    hasMore,
    loadMore: () => setPage((p) => p + 1),
  }
}
