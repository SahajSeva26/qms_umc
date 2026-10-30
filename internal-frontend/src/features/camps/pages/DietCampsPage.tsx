import { lazy, Suspense, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FiPlus, FiHeart, FiActivity, FiCheckCircle, FiMapPin, FiUsers, FiCpu } from 'react-icons/fi'
import { useCampsReal } from '@/features/camps/hooks/useCampsReal'
import { useCampTypeStatusCounts } from '@/features/camps/hooks/useCampTypeStatusCounts'
import { useCampsRealFilters } from '@/features/camps/hooks/useCampsRealFilters'
import { usePermission } from '@/hooks/usePermission'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import CampsFilterBarReal from '@/features/camps/components/CampsFilterBarReal'
import CampsKpiStripReal from '@/features/camps/components/CampsKpiStripReal'
import DietCampsStatusPills from '@/features/camps/components/DietCampsStatusPills'
import DietCampCard from '@/features/camps/components/DietCampCard'
import CampDrawer from '@/features/camps/components/CampDrawer'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { Button } from '@/components/ui/button'
import { usePagination } from '@/hooks/usePagination'
import type { BillingType, CampStatus } from '@/types/campReal.types'
import { EMPTY_ARRAY } from '@/utils/emptyArray'

// Matches /camps/new's own route guard — a camp:create-only actor must also see the button that leads there.
const CAMP_WRITE_PERMISSIONS = ['camp:create', 'camp:manage', 'tenant:manage']
const CAMP_CLIENT_FILTER_PERMISSIONS = ['camp:manage']
const TENANT_LOOKUP_PERMISSIONS = ['tenant:search', 'tenant:manage']
const PAGE_SIZE = 10

const DietitianRosterPanel = lazy(() => import('@/features/geo-profile/DietitianRosterPanel'))
const DietDevicesPanel = lazy(() => import('@/features/inventory/real/DietDevicesPanel'))

type DietOperationsTab = 'camps' | 'dietitians' | 'devices'

const DIET_OPERATIONS_TABS = [
  { id: 'camps', label: 'Camps', icon: FiHeart },
  { id: 'dietitians', label: 'Dietitians', icon: FiUsers },
  { id: 'devices', label: 'Devices', icon: FiCpu },
] as const

interface DietCampsListPanelProps {
  activeStatus: CampStatus | 'ALL'
  onStatusChange: (status: CampStatus | 'ALL') => void
  statusCounts: ReturnType<typeof useCampTypeStatusCounts>
}

const DietCampsListPanel = ({ activeStatus, onStatusChange, statusCounts }: DietCampsListPanelProps) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedCampId = searchParams.get('camp')
  const { hasAnyPermission } = usePermission()
  const canFilterByClient = hasAnyPermission(CAMP_CLIENT_FILTER_PERMISSIONS) && hasAnyPermission(TENANT_LOOKUP_PERMISSIONS)
  const { filters, setFilter, reset } = useCampsRealFilters()
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)
  const debouncedCode = useDebouncedValue(filters.code, 300)
  const debouncedCity = useDebouncedValue(filters.city, 300)
  const debouncedState = useDebouncedValue(filters.state, 300)

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

  const handleFilterChange = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
    if (key === 'status') onStatusChange(value as CampStatus | 'ALL')
    else setFilter(key, value)
    resetToFirstPage()
  }

  const handleReset = () => {
    reset()
    onStatusChange('ALL')
    resetToFirstPage()
  }

  return (
    <>
      {!statusCounts.isLoading && !statusCounts.isError && (
        <DietCampsStatusPills
          counts={statusCounts.counts}
          total={statusCounts.total}
          activeStatus={activeStatus}
          onSelect={(status) => handleFilterChange('status', status)}
        />
      )}

      <CampsFilterBarReal
        filters={{ ...filters, status: activeStatus }}
        setFilter={handleFilterChange}
        reset={handleReset}
        hideType
        canFilterByClient={canFilterByClient}
      />

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading diet camps…" errorLabel="Failed to load diet camps. Please try again." onRetry={refetch}>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
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
    </>
  )
}

const TabLoadingFallback = () => (
  <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }} aria-label="Loading tab">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="h-36 animate-pulse rounded-xl border" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }} />
    ))}
  </div>
)

interface DietOperationsTabsProps {
  activeTab: DietOperationsTab
  onSelect: (tab: DietOperationsTab) => void
}

const DietOperationsTabs = ({ activeTab, onSelect }: DietOperationsTabsProps) => (
  <nav className="mb-4 flex gap-1 overflow-x-auto border-b" style={{ borderColor: 'var(--qms-border)' }} aria-label="Diet camp management sections">
    {DIET_OPERATIONS_TABS.map(({ id, label, icon: Icon }) => {
      const selected = activeTab === id
      return (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          aria-current={selected ? 'page' : undefined}
          className="relative inline-flex shrink-0 items-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold transition-colors"
          style={{ color: selected ? 'var(--qms-brand)' : 'var(--qms-text-muted)' }}
        >
          <Icon size={14} /> {label}
          {selected && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full" style={{ background: 'var(--qms-brand)' }} />}
        </button>
      )
    })}
  </nav>
)

const DietCampsPage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { hasAnyPermission } = usePermission()
  const canWrite = hasAnyPermission(CAMP_WRITE_PERMISSIONS)
  const [activeStatus, setActiveStatus] = useState<CampStatus | 'ALL'>('ALL')
  const statusCounts = useCampTypeStatusCounts('diet')
  const requestedTab = searchParams.get('tab')
  const activeTab: DietOperationsTab = requestedTab === 'dietitians' || requestedTab === 'devices' ? requestedTab : 'camps'

  const selectTab = (tab: DietOperationsTab) => {
    const next = new URLSearchParams(searchParams)
    next.delete('camp')
    if (tab === 'camps') next.delete('tab')
    else next.set('tab', tab)
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Operations · Diet Camp Management</div>
          <h1 className="flex items-center gap-2 text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>
            <FiHeart size={20} style={{ color: '#10b981' }} /> Diet Camp Management
          </h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[
              { icon: FiActivity, label: 'Request-first workflow' },
              { icon: FiUsers, label: 'Dietitian + optional FO staffing' },
              { icon: FiMapPin, label: 'State and city filters' },
              { icon: FiCheckCircle, label: 'Real patient progress' },
            ].map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold"
                style={{ background: 'var(--qms-surface-card)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}
              >
                <Icon size={10} /> {label}
              </span>
            ))}
          </div>
        </div>
        {activeTab === 'camps' && canWrite && (
          <Button
            onClick={() => {
              const params = new URLSearchParams({ type: 'diet', from: `${window.location.pathname}${window.location.search}` })
              navigate(`/camps/new?${params.toString()}`)
            }}
            className="shrink-0 text-white"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            <FiPlus size={14} /> New request
          </Button>
        )}
      </div>

      <div
        className="mb-4 flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-3"
        style={{
          background: 'linear-gradient(105deg, color-mix(in srgb, var(--qms-brand) 10%, var(--qms-surface)), color-mix(in srgb, var(--qms-teal) 12%, var(--qms-surface)))',
          borderColor: 'color-mix(in srgb, var(--qms-brand) 18%, var(--qms-border))',
        }}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>
          <FiActivity size={17} />
        </span>
        <div className="min-w-0 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
          <strong style={{ color: 'var(--qms-text)' }}>Diet pipeline:</strong>{' '}
          {statusCounts.isLoading
            ? 'Checking the current camp pipeline…'
            : statusCounts.isError
              ? 'The pipeline summary could not be loaded.'
              : `${statusCounts.counts.requested} requested · ${statusCounts.counts.confirmed} upcoming · ${statusCounts.counts.live} live · ${statusCounts.counts.closed} completed`}
        </div>
        {statusCounts.isError && <Button variant="outline" size="sm" className="ml-auto shrink-0" onClick={statusCounts.refetch}>Retry</Button>}
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
          onSelectStatus={(status) => {
            setActiveStatus(status)
            if (activeTab !== 'camps') selectTab('camps')
          }}
        />
      </QueryStateBlock>

      <DietOperationsTabs activeTab={activeTab} onSelect={selectTab} />

      <Suspense fallback={<TabLoadingFallback />}>
        {activeTab === 'camps' && <DietCampsListPanel activeStatus={activeStatus} onStatusChange={setActiveStatus} statusCounts={statusCounts} />}
        {activeTab === 'dietitians' && <DietitianRosterPanel />}
        {activeTab === 'devices' && <DietDevicesPanel />}
      </Suspense>
    </div>
  )
}

export default DietCampsPage
