import { useMemo } from 'react'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useRoleTypes } from '@/features/access-management/role-type/hooks/useRoleTypes'
import { useGeoProfiles } from '@/features/geo-profile/hooks/useGeoProfiles'
import { EMPTY_ARRAY } from '@/utils/emptyArray'
import type { RoleEntity } from '@/types/accessManagement.types'
import type { GeoProfileEntity } from '@/types/geoProfile.types'

export interface FoRosterEntry {
  role: RoleEntity
  geoProfile?: GeoProfileEntity
}

interface UseFoRosterQuery {
  page?: string
  limit?: string
}

// Deliberately separate from useFieldOfficerRoles (inventory-assignment's own
// contract) and from usePeopleData (the mock roster still used by Assignments/
// Performance/Devices/Training/Expenses). Returns real Role + GeoProfile data
// as-is, not coerced into the mock Person shape.
export function useFoRoster(query: UseFoRosterQuery = {}) {
  const {
    data: foTypeData,
    isLoading: typeLoading,
    error: typeError,
    refetch: refetchType,
  } = useRoleTypes({ code: 'field-officer', status: 'active' })
  const foTypeId = foTypeData?.data?.items[0]?.id
  // Resolved (not loading, no error) but genuinely no matching RoleType — a real,
  // distinct state from "still loading," so the caller can render a clear message
  // instead of a silently-empty roster.
  const typeResolvedButMissing = !typeLoading && !typeError && !foTypeId

  const {
    data: roleData,
    isLoading: rolesLoading,
    error: rolesError,
    refetch: refetchRoles,
  } = useRoles(
    { type: foTypeId, status: 'active', page: query.page ?? '1', limit: query.limit ?? '10' },
    !!foTypeId,
  )
  const roles = roleData?.data?.items ?? EMPTY_ARRAY
  const count = roleData?.data?.count ?? 0

  const {
    data: geoData,
    isLoading: geoLoading,
    error: geoError,
    refetch: refetchGeo,
  } = useGeoProfiles({ type: 'fo', limit: '200' })
  const geoItems = geoData?.data?.items ?? EMPTY_ARRAY
  const geoTotalCount = geoData?.data?.count ?? 0
  // Visible to the caller, not just documented: true whenever the fetched page
  // doesn't cover the real total — the join below would then silently miss some
  // FOs' locations. No batch-by-role-list query exists on GeoProfile yet.
  const geoTruncated = geoTotalCount > geoItems.length
  const geoByRole = useMemo(() => new Map(geoItems.map((g) => [g.role, g])), [geoItems])

  const fos: FoRosterEntry[] = useMemo(
    () => roles.map((r) => ({ role: r, geoProfile: geoByRole.get(r.id) })),
    [roles, geoByRole],
  )

  return {
    fos,
    count,
    isLoading: typeLoading || rolesLoading || geoLoading,
    error: typeError || rolesError || geoError,
    typeResolvedButMissing,
    geoTruncated,
    refetch: () => {
      refetchType()
      refetchRoles()
      refetchGeo()
    },
  }
}
