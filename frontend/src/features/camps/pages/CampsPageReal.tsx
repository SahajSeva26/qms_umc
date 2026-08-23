import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPlus } from 'react-icons/fi'
import { useCampsReal } from '@/features/camps/hooks/useCampsReal'
import { useCampsRealFilters } from '@/features/camps/hooks/useCampsRealFilters'
import { usePermission } from '@/hooks/usePermission'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import CampsFilterBarReal from '@/features/camps/components/CampsFilterBarReal'
import CampsKpiStripReal from '@/features/camps/components/CampsKpiStripReal'
import CampTableReal from '@/features/camps/components/CampTableReal'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { Button } from '@/components/ui/button'
import { usePagination } from '@/hooks/usePagination'
import type { BillingType, CampStatus, CampType } from '@/features/camps/campReal.types'
import { EMPTY_ARRAY } from '@/utils/emptyArray'

// Hides "New camp" for camp:search-only actors (e.g. FOs) since the backend 403s any write.
const CAMP_WRITE_PERMISSIONS = ['camp:manage', 'tenant:manage']

const PAGE_SIZE = 20
const AGGREGATE_LIMIT = 10
const ALL_STATUSES: CampStatus[] = ['requested', 'confirmed', 'live', 'closed', 'cancelled', 'cancelled_charged']

const CampsPageReal = () => {
  const navigate = useNavigate()
  const { hasAnyPermission } = usePermission()
  const canWrite = hasAnyPermission(CAMP_WRITE_PERMISSIONS)
  const { filters, setFilter, reset } = useCampsRealFilters()
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)
  const debouncedCity = useDebouncedValue(filters.city, 300)
  const debouncedState = useDebouncedValue(filters.state, 300)

  const activeStatus = filters.status

  const { data, isLoading, error, refetch } = useCampsReal({
    status: activeStatus === 'ALL' ? undefined : activeStatus,
    type: filters.type === 'ALL' ? undefined : (filters.type as CampType),
    billingType: filters.billingType === 'ALL' ? undefined : (filters.billingType as BillingType),
    city: debouncedCity || undefined,
    state: debouncedState || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    page: String(page),
    limit: String(PAGE_SIZE),
  })
  const camps = data?.data?.items ?? EMPTY_ARRAY
  const totalCount = data?.data?.count ?? 0

  // Separate unpaginated fetch so the KPI strip's per-status counts reflect the whole dataset.
  const { data: allData } = useCampsReal({ limit: String(AGGREGATE_LIMIT) })
  const allCamps = allData?.data?.items ?? EMPTY_ARRAY
  const counts = useMemo(() => {
    const result: Record<CampStatus, number> = {
      requested: 0, confirmed: 0, live: 0, closed: 0, cancelled: 0, cancelled_charged: 0,
    }
    for (const c of allCamps) {
      if (ALL_STATUSES.includes(c.status)) result[c.status] += 1
    }
    return result
  }, [allCamps])

  const handleFilterChange = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
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
            Camp Management
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
            {!isLoading && !error ? `${totalCount} total` : 'Screening / Diet / Lab camps, wired to the real backend.'}
          </p>
        </div>
        {canWrite && (
          <Button
            onClick={() => navigate('/camps/new')}
            className="text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            <FiPlus size={14} /> New camp
          </Button>
        )}
      </div>

      <CampsKpiStripReal
        counts={counts}
        total={allCamps.length}
        activeStatus={activeStatus}
        onSelectStatus={(s) => handleFilterChange('status', s)}
      />

      <CampsFilterBarReal filters={filters} setFilter={handleFilterChange} reset={handleReset} />

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading camps…" errorLabel="Failed to load camps. Please try again." onRetry={refetch}>
        <CampTableReal camps={camps} onOpen={(id) => navigate(`/camps/${id}`)} />
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
      </QueryStateBlock>
    </div>
  )
}

export default CampsPageReal
