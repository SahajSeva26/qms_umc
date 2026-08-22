import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { FiNavigation, FiPlus } from 'react-icons/fi'
import { useGeoProfiles } from '@/features/geo-profile/hooks/useGeoProfiles'
import { useGeoProfilesFilters } from '@/features/geo-profile/hooks/useGeoProfilesFilters'
import { useRoles, roleKeys } from '@/features/access-management/role/hooks/useRoles'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import GeoProfilesTable from '@/features/geo-profile/components/GeoProfilesTable'
import GeoProfilesFilterBar from '@/features/geo-profile/components/GeoProfilesFilterBar'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { Button } from '@/components/ui/button'
import { GEO_PROFILE_ROUTES } from '@/features/geo-profile/geoProfile.constants'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import type { GeoProfileStatus, GeoProfileType } from '@/features/geo-profile/geoProfile.types'

const PAGE_SIZE = 10

const GeoProfilesListPage = () => {
  const navigate = useNavigate()
  const { hasPermission } = usePermission()
  const canManage = hasPermission('geo-profile:manage')
  const { filters, setFilter, reset } = useGeoProfilesFilters()
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)

  const { data, isLoading, error, refetch } = useGeoProfiles({
    type: filters.type === 'ALL' ? undefined : (filters.type as GeoProfileType),
    status: filters.status === 'ALL' ? undefined : (filters.status as GeoProfileStatus),
    page: String(page),
    limit: String(PAGE_SIZE),
  })
  const geoProfiles = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0

  // Backend flattens `role` to a bare ObjectId; resolve names via a separate lookup.
  // `error` distinguishes "403, no role permission" from "genuinely no roles" for an honest "Restricted" label.
  const { data: rolesData, error: rolesError, isFetched: rolesFetched } = useRoles({ status: 'active', limit: '500' })
  const activeRoles = rolesData?.data?.items ?? []

  // Roles deactivated after a profile was created won't be in the active-only list above; resolve the rest by id.
  const activeRoleIds = new Set(activeRoles.map((r) => r.id))
  const missingRoleIds = [...new Set(geoProfiles.map((p) => p.role))].filter((id) => !activeRoleIds.has(id))
  const missingRoleQueries = useQueries({
    queries: missingRoleIds.map((id) => ({
      queryKey: roleKeys.detail(id),
      queryFn: () => accessManagementService.getRole(id),
      enabled: rolesFetched && !rolesError,
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
    resetToFirstPage()
  }

  const handleReset = () => {
    reset()
    resetToFirstPage()
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
          {/* Hide create entry point rather than let a 403 hit on submit. */}
          {canManage && (
            <Button
              onClick={() => navigate(GEO_PROFILE_ROUTES.GEO_PROFILE_NEW)}
              className="text-white"
              style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
            >
              <FiPlus size={14} /> New geo profile
            </Button>
          )}
        </div>
      </div>

      <GeoProfilesFilterBar filters={filters} setFilter={handleFilterChange} reset={handleReset} />

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading geo profiles…" errorLabel="Failed to load geo profiles. Please try again." onRetry={refetch}>
        <GeoProfilesTable geoProfiles={geoProfiles} roleLabelById={roleLabelById} roleNamesForbidden={!!rolesError} />
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
      </QueryStateBlock>
    </div>
  )
}

export default GeoProfilesListPage
