import { useNavigate, useSearchParams } from 'react-router-dom'
import { FiPlus, FiHeart } from 'react-icons/fi'
import { useCampsReal } from '@/features/camps/hooks/useCampsReal'
import { useCampTypeStatusCounts } from '@/features/camps/hooks/useCampTypeStatusCounts'
import { useCampsRealFilters } from '@/features/camps/hooks/useCampsRealFilters'
import { usePermission } from '@/hooks/usePermission'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import CampsFilterBarReal from '@/features/camps/components/CampsFilterBarReal'
import CampsKpiStripReal from '@/features/camps/components/CampsKpiStripReal'
import CampsTabStrip from '@/features/camps/components/CampsTabStrip'
import DietCampCard from '@/features/camps/components/DietCampCard'
import CampDrawer from '@/features/camps/components/CampDrawer'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { Button } from '@/components/ui/button'
import { usePagination } from '@/hooks/usePagination'
import type { BillingType } from '@/types/campReal.types'
import { EMPTY_ARRAY } from '@/utils/emptyArray'

// Matches /camps/new's own route guard — a camp:create-only actor must also see the button that leads there.
const CAMP_WRITE_PERMISSIONS = ['camp:create', 'camp:manage', 'tenant:manage']
const CAMP_CLIENT_FILTER_PERMISSIONS = ['camp:manage']
const TENANT_LOOKUP_PERMISSIONS = ['tenant:search', 'tenant:manage']
const PAGE_SIZE = 10

// KPI/tab strip reuse the generic CampsKpiStripReal/CampsTabStrip (6 real CampStatus values) rather
// than the prototype's Diet-specific pills — the backend has no such status to back one.
//
// A "Dietitians" tab was built and reverted — GET /role-types requires tenant:manage/tenant:admin,
// which most camp viewers lack, and it reached into access-management's internals (modularity violation).
const DietCampsPage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedCampId = searchParams.get('camp')
  const { hasAnyPermission } = usePermission()
  const canWrite = hasAnyPermission(CAMP_WRITE_PERMISSIONS)
  const canFilterByClient = hasAnyPermission(CAMP_CLIENT_FILTER_PERMISSIONS) && hasAnyPermission(TENANT_LOOKUP_PERMISSIONS)
  const { filters, setFilter, reset } = useCampsRealFilters()
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)
  const debouncedCode = useDebouncedValue(filters.code, 300)
  const debouncedCity = useDebouncedValue(filters.city, 300)
  const debouncedState = useDebouncedValue(filters.state, 300)

  const activeStatus = filters.status

  const { data, isLoading, error, refetch } = useCampsReal({
    status: activeStatus === 'ALL' ? undefined : activeStatus,
    type: 'diet',
    billingType: filters.billingType === 'ALL' ? undefined : (filters.billingType as BillingType),
    code: debouncedCode || undefined,
    city: debouncedCity || undefined,
    state: debouncedState || undefined,
    doctor: filters.doctorId || undefined,
    tenant: canFilterByClient && filters.clientId ? filters.clientId : undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    page: String(page),
    limit: String(PAGE_SIZE),
    // Drives DietCampCard's real Done% stat.
    report: 'true',
  })
  const camps = data?.data?.items ?? EMPTY_ARRAY
  const totalCount = data?.data?.count ?? 0

  const statusCounts = useCampTypeStatusCounts('diet')

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
          <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Operations · Diet Camp Management</div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--qms-text)' }}>
            <FiHeart size={20} style={{ color: '#10b981' }} /> Diet Camps
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
            {!isLoading && !error ? `${totalCount} total` : 'Diet Camps wired to the real backend.'}
          </p>
        </div>
        {canWrite && (
          <Button
            onClick={() => {
              const params = new URLSearchParams({ type: 'diet', from: `${window.location.pathname}${window.location.search}` })
              navigate(`/camps/new?${params.toString()}`)
            }}
            className="text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            <FiPlus size={14} /> New diet camp
          </Button>
        )}
      </div>

      <QueryStateBlock
        isLoading={statusCounts.isLoading}
        error={statusCounts.isError}
        loadingLabel="Loading diet camp stats…"
        errorLabel="Failed to load diet camp stats."
        onRetry={statusCounts.refetch}
      >
        <CampsKpiStripReal
          counts={statusCounts.counts}
          total={statusCounts.total}
          activeStatus={activeStatus}
          onSelectStatus={(s) => handleFilterChange('status', s)}
        />
      </QueryStateBlock>

      <CampsTabStrip active={activeStatus} onSelect={(s) => handleFilterChange('status', s)} />

      <CampsFilterBarReal filters={filters} setFilter={handleFilterChange} reset={handleReset} hideType canFilterByClient={canFilterByClient} />

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading diet camps…" errorLabel="Failed to load diet camps. Please try again." onRetry={refetch}>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))' }}>
          {camps.map((camp) => (
            <DietCampCard
              key={camp.id}
              camp={camp}
              onOpen={(id) => {
                const next = new URLSearchParams(searchParams)
                next.set('camp', id)
                setSearchParams(next)
              }}
            />
          ))}
          {camps.length === 0 && (
            <div
              className="col-span-full px-4 py-10 text-center text-[13px] rounded-xl border"
              style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}
            >
              No diet camps found.
            </div>
          )}
        </div>
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
      </QueryStateBlock>

      <CampDrawer
        campId={selectedCampId}
        onClose={() => {
          const next = new URLSearchParams(searchParams)
          next.delete('camp')
          setSearchParams(next, { replace: true })
        }}
      />
    </div>
  )
}

export default DietCampsPage
