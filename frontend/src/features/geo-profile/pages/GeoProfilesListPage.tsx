import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiNavigation, FiPlus } from 'react-icons/fi'
import { useGeoProfiles } from '@/features/geo-profile/hooks/useGeoProfiles'
import { useGeoProfilesFilters } from '@/features/geo-profile/hooks/useGeoProfilesFilters'
import GeoProfilesTable from '@/features/geo-profile/components/GeoProfilesTable'
import GeoProfilesFilterBar from '@/features/geo-profile/components/GeoProfilesFilterBar'
import PaginationControls from '@/components/ui/PaginationControls'
import { GEO_PROFILE_ROUTES } from '@/features/geo-profile/geoProfile.routes'
import { Button } from '@/components/ui/button'
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

  const handleFilterChange = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
    setFilter(key, value)
    setPage(1)
  }

  const handleReset = () => {
    reset()
    setPage(1)
  }

  return (
    <div className="max-w-5xl">
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
          <GeoProfilesTable geoProfiles={geoProfiles} />
          <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}

export default GeoProfilesListPage
