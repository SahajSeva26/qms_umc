import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { FiNavigation, FiPlus } from 'react-icons/fi'
import { useGeoProfiles } from '@/features/geo-profile/hooks/useGeoProfiles'
import { useGeoProfilesFilters } from '@/features/geo-profile/hooks/useGeoProfilesFilters'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import GeoProfilesTable from '@/features/geo-profile/components/GeoProfilesTable'
import GeoProfilesFilterBar from '@/features/geo-profile/components/GeoProfilesFilterBar'
import PaginationControls from '@/components/ui/PaginationControls'
import { Button } from '@/components/ui/button'
import { GEO_PROFILE_ROUTES } from '@/features/geo-profile/geoProfile.constants'
import type { GeoProfileStatus, GeoProfileType } from '@/types/geoProfile.types'

const PAGE_SIZE = 10

// Mirrors `@/features/access-management/role/pages/RolesListPage.tsx` exactly.
// geoProfile.service.ts's search() defaults `where.status = 'active'`
// unconditionally, only overridden when the caller both asks for a status AND
// holds `geo-profile:manage` — so an unfiltered call already returns
// everything the caller is allowed to see, same as Role/Doctor.
const GeoProfilesListPage = () => {
  const navigate = useNavigate()
  const { filters, setFilter, reset } = useGeoProfilesFilters()
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useGeoProfiles({
    type: filters.type === 'ALL' ? undefined : (filters.type as GeoProfileType),
    status: filters.status === 'ALL' ? undefined : (filters.status as GeoProfileStatus),
    page: String(page),
    limit: String(PAGE_SIZE),
  })
  const geoProfiles = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  // GeoProfileMapper.toResponse (backend) always flattens `role` to a bare
  // ObjectId string, even though geoProfile.service.ts's search() populates
  // it server-side — the populated name/code is discarded before the
  // response ever leaves the backend, so this list has no way to get a
  // resolved name except a separate lookup, same pattern already used by
  // GeoProfileDetailPage.tsx's own roleName() helper. Without this, the
  // Role column rendered a raw 24-char hex id for every row. Found via a
  // 2026-07-26 ground-up test pass.
  // GET /roles requires role:get/role:search/role:manage — a caller without
  // any of those (e.g. a Pharma MR) gets a 403 here, which useRoles surfaces
  // as `error`, not as an empty result. Distinguish that from "no roles
  // exist" so the table shows an honest "Unrestricted" label instead of
  // silently falling through to the raw ObjectId (found via a live test
  // with a zero-permission account, 2026-08-10).
  const { data: rolesData, error: rolesError } = useRoles({ status: 'active', limit: '500' })
  const activeRoles = rolesData?.data?.items ?? []

  // A GeoProfile's role can be deactivated AFTER the profile was created —
  // the active-only list above won't include it. SearchRoleQuery has no
  // "give me these specific ids" filter, so resolve whichever ids on THIS
  // page aren't already in the active list via individual GET /roles/:id
  // calls instead (bounded to page size, max 10, so this stays cheap).
  const activeRoleIds = new Set(activeRoles.map((r) => r.id))
  const missingRoleIds = [...new Set(geoProfiles.map((p) => p.role))].filter((id) => !activeRoleIds.has(id))
  const missingRoleQueries = useQueries({
    queries: missingRoleIds.map((id) => ({
      queryKey: ['role', id],
      queryFn: () => accessManagementService.getRole(id),
    })),
  })

  const roleLabelById = useMemo(() => {
    const map = new Map(activeRoles.map((r) => [r.id, r.name]))
    for (const q of missingRoleQueries) {
      const role = q.data?.data
      if (role) map.set(role.id, role.name)
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoles, missingRoleQueries.map((q) => q.dataUpdatedAt).join(',')])

  const handleFilterChange = <K extends keyof typeof filters>(key: K, value: string | null | undefined) => {
    setFilter(key, value)
    setPage(1)
  }

  const handleReset = () => {
    reset()
    setPage(1)
  }

  return (
    <div className="w-full">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>
            Field Staff Coverage
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
            {!isLoading && !error
              ? `${totalCount} total`
              : 'Location + coverage radius per Field Officer / Dietitian, used for camp allocation.'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={() => navigate(GEO_PROFILE_ROUTES.GEO_PROFILE_NEAREST)}>
            <FiNavigation size={14} /> Nearest lookup
          </Button>
          <Button
            onClick={() => navigate(GEO_PROFILE_ROUTES.GEO_PROFILE_NEW)}
            className="text-white"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            <FiPlus size={14} /> New geo profile
          </Button>
        </div>
      </div>

      <GeoProfilesFilterBar filters={filters} setFilter={handleFilterChange} reset={handleReset} />

      {isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading geo profiles…
        </div>
      )}

      {error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load geo profiles. Please try again.
        </div>
      )}

      {!isLoading && !error && (
        <>
          <GeoProfilesTable geoProfiles={geoProfiles} roleLabelById={roleLabelById} roleNamesForbidden={!!rolesError} />
          <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}

export default GeoProfilesListPage
