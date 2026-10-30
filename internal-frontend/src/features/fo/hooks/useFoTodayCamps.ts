import { useMemo } from 'react'
import { useCampsReal } from '@/features/camps/hooks/useCampsReal'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useRoleTypes } from '@/features/access-management/role-type/hooks/useRoleTypes'
import { EMPTY_ARRAY } from '@/utils/emptyArray'

const NOT_CANCELLED = new Set(['cancelled', 'cancelled_charged'])

// Real GET /camps?dateFrom=today&dateTo=today, platform-wide (not per-FO).
// Bounded to 200 rows — no unpaginated "camps today" endpoint exists.
export function useFoTodayCamps() {
  const todayIso = new Date().toISOString().slice(0, 10)
  const { data, isLoading, error, refetch } = useCampsReal({
    dateFrom: todayIso,
    dateTo: todayIso,
    limit: '200',
  })
  const camps = data?.data?.items ?? EMPTY_ARRAY
  const totalCount = data?.data?.count ?? 0
  const truncated = totalCount > camps.length

  const liveCamps = camps.filter((c) => c.status === 'live')
  const unassignedCamps = camps.filter((c) => !c.fo && !NOT_CANCELLED.has(c.status))

  return { camps, totalCount, liveCamps, unassignedCamps, truncated, isLoading, error, refetch }
}

// Real Active-FOs total + Idle-today count (FOs with no camp today, cross-
// referenced against todayCamps). Bounded to 500 FO roles in one page.
export function useFoActiveCount(todayCamps: ReturnType<typeof useFoTodayCamps>['camps']) {
  const {
    data: foTypeData,
    isLoading: typeLoading,
    error: typeError,
    refetch: refetchType,
  } = useRoleTypes({ code: 'field-officer', status: 'active' })
  const foTypeId = foTypeData?.data?.items[0]?.id
  const {
    data: roleData,
    isLoading: rolesLoading,
    error: rolesError,
    refetch: refetchRoles,
  } = useRoles({ type: foTypeId, status: 'active', limit: '500' }, !!foTypeId)
  const totalActive = roleData?.data?.count ?? 0
  const roles = roleData?.data?.items ?? EMPTY_ARRAY
  const roleTruncated = totalActive > roles.length
  // Roles stays disabled while role-type loads, so its own isLoading under-reports alone.
  const isLoading = typeLoading || rolesLoading
  const error = typeError || rolesError
  const refetch = () => { refetchType(); refetchRoles() }

  const foIdsWithCampToday = useMemo(() => {
    const ids = new Set<string>()
    for (const camp of todayCamps) {
      const foId = camp.fo && typeof camp.fo !== 'string' ? camp.fo._id : camp.fo
      if (foId) ids.add(foId)
    }
    return ids
  }, [todayCamps])

  const idleCount = roles.filter((r) => !foIdsWithCampToday.has(r.id)).length

  return { totalActive, idleCount, roleTruncated, isLoading, error, refetch }
}
