import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FiPlus, FiSun } from 'react-icons/fi'
import { useCampsReal } from '@/features/camps/hooks/useCampsReal'
import { useCampReport } from '@/features/camps/hooks/useCampReport'
import { useCampsRealFilters } from '@/features/camps/hooks/useCampsRealFilters'
import { usePermission } from '@/hooks/usePermission'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import CampsFilterBarReal from '@/features/camps/components/CampsFilterBarReal'
import CampsKpiStripReal from '@/features/camps/components/CampsKpiStripReal'
import CampsTabStrip from '@/features/camps/components/CampsTabStrip'
import CampsTypeBreakdownChips from '@/features/camps/components/CampsTypeBreakdownChips'
import CampCardReal from '@/features/camps/components/CampCardReal'
import CampTableReal from '@/features/camps/components/CampTableReal'
import CampDrawer from '@/features/camps/components/CampDrawer'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { Button } from '@/components/ui/button'
import { usePagination } from '@/hooks/usePagination'
import type { BillingType, CampStatus, CampType } from '@/types/campReal.types'
import { EMPTY_ARRAY } from '@/utils/emptyArray'

// Matches /camps/new's own route guard — a camp:create-only actor must also see the button that leads there.
const CAMP_WRITE_PERMISSIONS = ['camp:create', 'camp:manage', 'tenant:manage']
// GET /camps/report requires this exact set — stricter than camp:search, which 403s on the report endpoint.
const CAMP_REPORT_PERMISSIONS = ['camp:manage', 'tenant:manage']
// The `tenant` search filter is honored server-side only for camp:manage, NOT tenant:manage (camp.service.ts).
const CAMP_CLIENT_FILTER_PERMISSIONS = ['camp:manage']
// TenantAsyncPicker calls GET /tenants (tenant:search/tenant:manage) — required before offering the Client search box.
const TENANT_LOOKUP_PERMISSIONS = ['tenant:search', 'tenant:manage']

const PAGE_SIZE = 10
const ALL_STATUSES: CampStatus[] = ['requested', 'confirmed', 'live', 'closed', 'cancelled', 'cancelled_charged']

// Cards for the "in-flight" requested/upcoming/live stages, a denser table for the "settled" stages.
const CARD_VIEW_STATUSES = new Set<CampStatus>(['requested', 'confirmed', 'live'])

const CampsPageReal = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedCampId = searchParams.get('camp')
  const { hasAnyPermission } = usePermission()
  const canWrite = hasAnyPermission(CAMP_WRITE_PERMISSIONS)
  const canViewReport = hasAnyPermission(CAMP_REPORT_PERMISSIONS)
  const canFilterByClient = hasAnyPermission(CAMP_CLIENT_FILTER_PERMISSIONS) && hasAnyPermission(TENANT_LOOKUP_PERMISSIONS)
  const { filters, setFilter, reset } = useCampsRealFilters()
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)
  const debouncedCode = useDebouncedValue(filters.code, 300)
  const debouncedCity = useDebouncedValue(filters.city, 300)
  const debouncedState = useDebouncedValue(filters.state, 300)

  const activeStatus = filters.status

  const { data, isLoading, error, refetch } = useCampsReal({
    status: activeStatus === 'ALL' ? undefined : activeStatus,
    type: filters.type === 'ALL' ? undefined : (filters.type as CampType),
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
    // Drives CampCardReal's real Patients/Done% stat — no extra permission gate on this flag.
    report: 'true',
  })
  const camps = data?.data?.items ?? EMPTY_ARRAY
  const totalCount = data?.data?.count ?? 0

  const reportQuery = useCampReport(canViewReport)
  const counts = useMemo(() => {
    const result: Record<CampStatus, number> = {
      requested: 0, confirmed: 0, live: 0, closed: 0, cancelled: 0, cancelled_charged: 0,
    }
    for (const entry of reportQuery.data?.data?.byStatus ?? EMPTY_ARRAY) {
      if (ALL_STATUSES.includes(entry.status)) result[entry.status] = entry.count
    }
    return result
  }, [reportQuery.data])
  const totalCamps = reportQuery.data?.data?.summary.totalCamps ?? 0

  // CampReportQuerySchema accepts only `status` — once any other filter narrows the table, the
  // chips would silently go global-for-this-status again, so track it to hide/relabel instead.
  const hasNonStatusFilter = !!(
    debouncedCode || debouncedCity || debouncedState || filters.doctorId ||
    (canFilterByClient && filters.clientId) || filters.dateFrom || filters.dateTo ||
    filters.type !== 'ALL' || filters.billingType !== 'ALL'
  )
  const tabTypeReportQuery = useCampReport(canViewReport && !hasNonStatusFilter, activeStatus === 'ALL' ? undefined : activeStatus)
  const tabTypeBreakdown = tabTypeReportQuery.data?.data?.byType ?? EMPTY_ARRAY
  const tabTotalCamps = tabTypeReportQuery.data?.data?.summary.totalCamps ?? totalCount

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
          <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Operations · Camp Management</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>
            Camp Management
          </h1>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span
              className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-full border"
              style={{ background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#10b981' }} />
              Live operations
            </span>
            <span
              className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-full border"
              style={{ background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}
            >
              <FiSun size={12} /> Screening · Diet · Lab
            </span>
          </div>
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

      {!isLoading && !error && (
        <p className="text-[12px] mb-3" style={{ color: 'var(--qms-text-muted)' }}>{totalCount} total</p>
      )}

      {canViewReport && (
        <QueryStateBlock
          isLoading={reportQuery.isLoading}
          error={reportQuery.isError}
          loadingLabel="Loading camp report…"
          errorLabel="Failed to load camp report."
          onRetry={reportQuery.refetch}
        >
          <CampsKpiStripReal
            counts={counts}
            total={totalCamps}
            activeStatus={activeStatus}
            onSelectStatus={(s) => handleFilterChange('status', s)}
          />
        </QueryStateBlock>
      )}

      <CampsTabStrip
        active={activeStatus}
        onSelect={(tab) => handleFilterChange('status', tab)}
      />

      <CampsFilterBarReal filters={filters} setFilter={handleFilterChange} reset={handleReset} canFilterByClient={canFilterByClient} />

      {activeStatus !== 'ALL' && CARD_VIEW_STATUSES.has(activeStatus) && (
        <CampsTypeBreakdownChips
          byType={tabTypeBreakdown}
          totalCount={tabTotalCamps}
          isLoading={canViewReport && !hasNonStatusFilter && tabTypeReportQuery.isLoading}
          error={!hasNonStatusFilter ? tabTypeReportQuery.error : undefined}
          onRetry={() => void tabTypeReportQuery.refetch()}
          canView={canViewReport}
          unavailableWhileFiltered={hasNonStatusFilter}
        />
      )}

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading camps…" errorLabel="Failed to load camps. Please try again." onRetry={refetch}>
        {activeStatus !== 'ALL' && CARD_VIEW_STATUSES.has(activeStatus) ? (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))' }}>
            {camps.map((camp) => (
              <CampCardReal
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
                No camps found.
              </div>
            )}
          </div>
        ) : (
          <CampTableReal
            camps={camps}
            onOpen={(id) => {
              const next = new URLSearchParams(searchParams)
              next.set('camp', id)
              setSearchParams(next)
            }}
          />
        )}
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
      </QueryStateBlock>

      <CampDrawer
        campId={selectedCampId}
        onClose={() => {
          // Replaces, not pushes — otherwise Back after closing would reopen the drawer.
          const next = new URLSearchParams(searchParams)
          next.delete('camp')
          setSearchParams(next, { replace: true })
        }}
      />
    </div>
  )
}

export default CampsPageReal
