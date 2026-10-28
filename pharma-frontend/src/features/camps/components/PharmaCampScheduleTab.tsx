import { lazy, Suspense, useState } from 'react'
import { FiCalendar } from 'react-icons/fi'
import { usePharmaCamps } from '@/features/camps/hooks/usePharmaCamps'
import PharmaCampScheduleTable from '@/features/camps/components/PharmaCampScheduleTable'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import PaginationControls from '@/components/ui/PaginationControls'
import DialogErrorBoundary from '@/components/ui/DialogErrorBoundary'
import { usePagination } from '@/hooks/usePagination'
import { CAMP_SCHEDULE_STATUS_TABS } from '@/features/camps/campDashboardStatus'
import type { CampEntity, CampStatus } from '@/types/campReal.types'

// Read-only camp detail only — row actions (dossier, rating) stay on MyCampScheduleTab (MR-only),
// since those need per-role backend-permission confirmation before being extended here. This
// component intentionally has no "next safe increment" built in ahead of that confirmation.
const PharmaCampDetailDrawer = lazy(() => import('@/features/camps/components/PharmaCampDetailDrawer'))

const PAGE_SIZE = 10

type ScheduleTab = CampStatus | 'all'
const TAB_ORDER: ScheduleTab[] = ['all', ...CAMP_SCHEDULE_STATUS_TABS.map((t) => t.value)]
const TAB_LABEL: Record<ScheduleTab, string> = {
  all: 'All',
  ...Object.fromEntries(CAMP_SCHEDULE_STATUS_TABS.map((t) => [t.value, t.label])),
} as Record<ScheduleTab, string>
const tabLabel = (tab: ScheduleTab) => TAB_LABEL[tab]

// Matches the real content's shape (table rows + pagination) so the shimmer never jumps in size
// once data arrives.
const SCHEDULE_SKELETON = (
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

// Role-aware Camp Schedule for HO/RSM/ASM — real GET /camps (server-scoped by role: today HO is
// correctly whole-division; ASM/RSM scoping has a known backend gap, see
// md-files/BACKEND_REQUEST_camp-asm-rsm-own-scope.md — not addressed client-side, by design: this
// component does no downline resolution or extra filtering of its own, and must not, since that
// would be a client-side security boundary pretending to be real. Unlike MR's /camps/my, this
// endpoint has no server-computed summary block, so status tabs show no counts (vs. MyCampScheduleTab's
// count-bearing tabs) — adding counts here would mean a second, different aggregate call this
// slice doesn't need yet.
const PharmaCampScheduleTab = () => {
  const [activeTab, setActiveTab] = useState<ScheduleTab>('all')
  const [openCamp, setOpenCamp] = useState<CampEntity | null>(null)
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)

  const { data, isLoading, isFetching, error, refetch } = usePharmaCamps(
    {
      status: activeTab === 'all' ? undefined : activeTab,
      page: String(page),
      limit: String(PAGE_SIZE),
    },
    { keepPreviousData: true },
  )
  const camps = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0

  const handleSelectTab = (tab: ScheduleTab) => {
    setActiveTab(tab)
    resetToFirstPage()
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <FiCalendar size={16} style={{ color: 'var(--qms-brand)' }} />
        <h2 className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Camp schedule</h2>
      </div>
      <p className="text-[12px] mb-4" style={{ color: 'var(--qms-text-muted)' }}>
        {totalCount} camp{totalCount === 1 ? '' : 's'} · use View details to open a camp
      </p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {TAB_ORDER.map((tab) => {
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => handleSelectTab(tab)}
              className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors border"
              style={{
                color: isActive ? 'white' : 'var(--qms-text-soft)',
                background: isActive ? 'var(--qms-brand)' : 'var(--qms-surface-card)',
                borderColor: isActive ? 'var(--qms-brand)' : 'var(--qms-border)',
              }}
            >
              {tabLabel(tab)}
            </button>
          )
        })}
      </div>

      <QueryStateBlock
        isLoading={isLoading}
        error={error}
        loadingLabel="Loading camps…"
        errorLabel="Failed to load camps. Please try again."
        onRetry={refetch}
        loadingSkeleton={SCHEDULE_SKELETON}
        isFetching={isFetching}
      >
        {camps.length === 0 ? (
          <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
            No camps in this status yet.
          </div>
        ) : (
          <PharmaCampScheduleTable camps={camps} onOpenCamp={setOpenCamp} />
        )}
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} disabled={isFetching} />
      </QueryStateBlock>

      {openCamp && (
        <DialogErrorBoundary onClose={() => setOpenCamp(null)}>
          <Suspense fallback={null}>
            <PharmaCampDetailDrawer camp={openCamp} onClose={() => setOpenCamp(null)} />
          </Suspense>
        </DialogErrorBoundary>
      )}
    </div>
  )
}

export default PharmaCampScheduleTab
