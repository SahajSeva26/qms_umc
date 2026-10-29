import { lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import { usePharmaCamps } from '@/features/camps/hooks/usePharmaCamps'
import { usePharmaCamp } from '@/features/camps/hooks/usePharmaCamp'
import { useCampManagementFilters } from '@/features/camps/hooks/useCampManagementFilters'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePagination } from '@/hooks/usePagination'
import PharmaRoleGate from '@/features/pharma/components/PharmaRoleGate'
import CampManagementFilterBar from '@/features/camps/components/CampManagementFilterBar'
import CampManagementTabStrip, { type CampManagementTab } from '@/features/camps/components/CampManagementTabStrip'
import CampManagementCard from '@/features/camps/components/CampManagementCard'
import CampManagementTable from '@/features/camps/components/CampManagementTable'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import DialogErrorBoundary from '@/components/ui/DialogErrorBoundary'
import DialogOpeningFallback from '@/components/ui/DialogOpeningFallback'
import SideDrawer from '@/components/ui/SideDrawer'
import { Button } from '@qms/ui'
import type { BillingType, CampStatus, CampType } from '@/types/campReal.types'

const PharmaCampDetailDrawer = lazy(() => import('@/features/camps/components/PharmaCampDetailDrawer'))

const PAGE_SIZE = 10
const CARD_VIEW_STATUSES = new Set<CampStatus>(['requested', 'confirmed', 'live'])

// Matches the real list/table's row shape so the shimmer never jumps in size once data arrives.
const LIST_SKELETON = (
  <div aria-busy="true" aria-live="polite" className="animate-pulse">
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: i < 5 ? '1px solid var(--qms-border)' : undefined }}>
          <div className="h-3.5 w-24 rounded" style={{ background: 'var(--qms-surface-strong)' }} />
          <div className="h-3.5 w-20 rounded" style={{ background: 'var(--qms-surface-strong)' }} />
          <div className="h-3.5 w-28 rounded ml-auto" style={{ background: 'var(--qms-surface-strong)' }} />
          <div className="h-3.5 w-16 rounded" style={{ background: 'var(--qms-surface-strong)' }} />
        </div>
      ))}
    </div>
  </div>
)

// Matches PharmaCampDetailDrawer's real section shape so the shimmer never jumps in size once
// the deep-linked camp (fetched via GET /camps/:id, not from the loaded list) arrives.
const DRAWER_SKELETON = (
  <div aria-busy="true" aria-live="polite" className="animate-pulse">
    <div className="h-5 w-40 rounded mb-4" style={{ background: 'var(--qms-surface-strong)' }} />
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="rounded-[14px] border p-3 mb-3" style={{ borderColor: 'var(--qms-border)' }}>
        <div className="h-3 w-24 rounded mb-2" style={{ background: 'var(--qms-surface-strong)' }} />
        <div className="h-3.5 w-full rounded" style={{ background: 'var(--qms-surface-strong)' }} />
      </div>
    ))}
  </div>
)

// Sidebar-level page, reachable by all four pharma role types — real GET /camps, server-scoped per
// role (division-head: whole division; MR/ASM/RSM: camps where their own role id is stamped on an
// assignment field, resolved at booking time from the MR's real supervisor chain — see
// resolveMrChain in camp.service.ts). Distinct from the lighter "Camp schedule" portal tabs
// (PharmaCampScheduleTab/MyCampScheduleTab) — this page ports internal-frontend's real
// CampsPageReal.tsx (pre-split, the same page MR/ASM/RSM already reached via an internal-app
// routing exception), trimmed of every camp:manage/tenant:manage-gated surface: no KPI strip, no
// "New camp" button, no type-breakdown chips, no tenant/client filter — no pharma role holds those
// permissions. Division-head is a new addition here (the old exception never included it), backed
// by the fact the backend already scopes division-head correctly (division-wide).
const CampManagementPageContent = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedCampId = searchParams.get('camp')
  const { filters, setFilter, reset } = useCampManagementFilters()
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)
  const debouncedCode = useDebouncedValue(filters.code, 300)
  const debouncedCity = useDebouncedValue(filters.city, 300)
  const debouncedState = useDebouncedValue(filters.state, 300)

  const activeStatus = filters.status

  const { data, isLoading, isFetching, error, refetch } = usePharmaCamps(
    {
      status: activeStatus === 'ALL' ? undefined : activeStatus,
      type: filters.type === 'ALL' ? undefined : (filters.type as CampType),
      billingType: filters.billingType === 'ALL' ? undefined : (filters.billingType as BillingType),
      code: debouncedCode || undefined,
      city: debouncedCity || undefined,
      state: debouncedState || undefined,
      doctor: filters.doctorId || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      page: String(page),
      limit: String(PAGE_SIZE),
      report: 'true',
    },
    { keepPreviousData: true },
  )
  const camps = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0
  // The selected camp may not be on the current page/filter/status — a shared link, notification
  // link, or a filter/pagination change after opening the drawer must not make it vanish. Prefers
  // the already-loaded row and falls back to the scoped GET /camps/:id — but only once the list
  // query has actually settled (isLoading false): camps is [] on the very first render regardless
  // of whether the selected camp will end up on the page, so gating on campFromList alone would
  // fire the fallback fetch on every deep link, even one the list goes on to satisfy.
  const campFromList = camps.find((c) => c.id === selectedCampId) ?? null
  const needsFetchedCamp = !isLoading && !campFromList
  const { data: fetchedCampData, isError: isCampError, refetch: refetchCamp } =
    usePharmaCamp(needsFetchedCamp ? (selectedCampId ?? undefined) : undefined)
  const openCamp = campFromList ?? fetchedCampData?.data ?? null

  const handleFilterChange = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
    setFilter(key, value)
    resetToFirstPage()
  }

  const handleReset = () => {
    reset()
    resetToFirstPage()
  }

  const handleSelectTab = (tab: CampManagementTab) => {
    handleFilterChange('status', tab)
  }

  const handleOpen = (id: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('camp', id)
    setSearchParams(next)
  }

  const handleCloseDrawer = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('camp')
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="w-full">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Operations · Camp Management</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Camp Management</h1>
        </div>
      </div>

      {!isLoading && !error && (
        <p className="text-[12px] mb-3" style={{ color: 'var(--qms-text-muted)' }}>{totalCount} total</p>
      )}

      <CampManagementTabStrip active={activeStatus} onSelect={handleSelectTab} />

      <CampManagementFilterBar filters={filters} setFilter={handleFilterChange} reset={handleReset} />

      <QueryStateBlock
        isLoading={isLoading}
        error={error}
        loadingLabel="Loading camps…"
        errorLabel="Failed to load camps. Please try again."
        onRetry={refetch}
        loadingSkeleton={LIST_SKELETON}
        isFetching={isFetching}
      >
        {activeStatus !== 'ALL' && CARD_VIEW_STATUSES.has(activeStatus) ? (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))' }}>
            {camps.map((camp) => (
              <CampManagementCard key={camp.id} camp={camp} onOpen={handleOpen} />
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
          <CampManagementTable camps={camps} onOpen={handleOpen} />
        )}
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} disabled={isFetching} />
      </QueryStateBlock>

      {selectedCampId && !openCamp && (
        // Either the list query is still settling (the first render before isLoading flips, or a
        // filter/pagination change mid-flight), or it settled without the camp and the fallback
        // GET /camps/:id fetch is now in flight or failed.
        <SideDrawer open title="Loading camp…" onClose={handleCloseDrawer} widthClassName="max-w-lg">
          {isCampError ? (
            <div className="text-[13px] py-10 text-center">
              <p className="mb-3" style={{ color: 'var(--qms-text-muted)' }}>Failed to load this camp. Please try again.</p>
              <Button variant="outline" size="sm" onClick={() => refetchCamp()}>Retry</Button>
            </div>
          ) : (
            DRAWER_SKELETON
          )}
        </SideDrawer>
      )}

      {openCamp && (
        <DialogErrorBoundary onClose={handleCloseDrawer}>
          <Suspense fallback={<DialogOpeningFallback title="Opening camp…" />}>
            <PharmaCampDetailDrawer camp={openCamp} onClose={handleCloseDrawer} />
          </Suspense>
        </DialogErrorBoundary>
      )}
    </div>
  )
}

const PHARMA_ROLE_TYPES = ['pharma-division-head', 'pharma-mr', 'pharma-rsm', 'pharma-asm']

const CampManagementPage = () => (
  <PharmaRoleGate roleTypeCode={PHARMA_ROLE_TYPES}>
    <CampManagementPageContent />
  </PharmaRoleGate>
)

export default CampManagementPage
