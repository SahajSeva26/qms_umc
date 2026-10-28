import { lazy, Suspense, useState } from 'react'
import { FiCalendar } from 'react-icons/fi'
import { usePharmaMyCamps } from '@/features/pharma/hooks/usePharmaMyCamps'
import MrCampScheduleTable from '@/features/pharma/components/MrCampScheduleTable'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import PaginationControls from '@/components/ui/PaginationControls'
import { usePagination } from '@/hooks/usePagination'
import { CAMP_SCHEDULE_STATUS_TABS } from '@/features/pharma/campDashboardStatus'
import type { CampEntity, CampStatus } from '@/types/campReal.types'

// Both pull in the rating module (useRatings/RatingDisplay/RateCampModal) and, for the dossier,
// the full CampDossierContent card stack — real code a user who only browses the table (never
// opens a row) shouldn't have to download. Lazy, each with its own mount-gated Suspense below, so
// neither chunk loads until the user actually opens a row/dossier.
const PharmaCampDetailDrawer = lazy(() => import('@/features/pharma/components/PharmaCampDetailDrawer'))
const CampDossierModal = lazy(() => import('@/features/pharma/components/dossier/CampDossierModal'))

const PAGE_SIZE = 10

type ScheduleTab = CampStatus | 'all'
// Exact DOM order + labels: All, Requested, Ongoing (live), Upcoming (confirmed),
// Completed (closed), Cancelled, Cancelled but charged.
const TAB_ORDER: ScheduleTab[] = ['all', ...CAMP_SCHEDULE_STATUS_TABS.map((t) => t.value)]
const TAB_LABEL: Record<ScheduleTab, string> = {
  all: 'All',
  ...Object.fromEntries(CAMP_SCHEDULE_STATUS_TABS.map((t) => [t.value, t.label])),
} as Record<ScheduleTab, string>
const tabLabel = (tab: ScheduleTab) => TAB_LABEL[tab]

// Matches the real content's shape (table rows + pagination) so the shimmer never jumps in size
// once data arrives. The tab-pill row above stays visible while this shows, since its counts come
// from the same summary and render as 0 until then anyway.
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

// Real GET /camps/my, not a mock — field-force's own camps across every project, with a
// server-computed status/type summary (CampSummary) independent of the current page/filter.
// Mirrors internal-frontend's MyCampScheduleTab.tsx.
const MyCampScheduleTab = () => {
  const [activeTab, setActiveTab] = useState<ScheduleTab>('all')
  const [openCamp, setOpenCamp] = useState<CampEntity | null>(null)
  const [dossierCampId, setDossierCampId] = useState<string | null>(null)
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)

  const { data, isLoading, isFetching, error, refetch } = usePharmaMyCamps(
    {
      status: activeTab === 'all' ? undefined : activeTab,
      page: String(page),
      limit: String(PAGE_SIZE),
    },
    { keepPreviousData: true },
  )
  const camps = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0
  const summary = data?.data?.summary
  const countFor = (tab: ScheduleTab) =>
    tab === 'all' ? (summary?.totalCamps ?? 0) : (summary?.statusCounts.find((s) => s.status === tab)?.count ?? 0)

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
        {totalCount} of {summary?.totalCamps ?? totalCount} camps · click any row for full details
      </p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {TAB_ORDER.map((tab) => {
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => handleSelectTab(tab)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors border"
              style={{
                color: isActive ? 'white' : 'var(--qms-text-soft)',
                background: isActive ? 'var(--qms-brand)' : 'var(--qms-surface-card)',
                borderColor: isActive ? 'var(--qms-brand)' : 'var(--qms-border)',
              }}
            >
              {tabLabel(tab)}
              <span
                className="text-[11px] font-bold rounded-full px-1.5"
                style={{ background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--qms-surface-hover)' }}
              >
                {countFor(tab)}
              </span>
            </button>
          )
        })}
      </div>

      <QueryStateBlock
        isLoading={isLoading}
        error={error}
        loadingLabel="Loading your camps…"
        errorLabel="Failed to load your camps. Please try again."
        onRetry={refetch}
        loadingSkeleton={SCHEDULE_SKELETON}
        isFetching={isFetching}
      >
        {camps.length === 0 ? (
          <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
            No camps in this status yet.
          </div>
        ) : (
          <MrCampScheduleTable
            camps={camps}
            onOpenCamp={setOpenCamp}
            onOpenDossier={(camp) => setDossierCampId(camp.id)}
            onRateCamp={setOpenCamp}
          />
        )}
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} disabled={isFetching} />
      </QueryStateBlock>

      {openCamp && (
        <Suspense fallback={null}>
          <PharmaCampDetailDrawer
            camp={openCamp}
            onClose={() => setOpenCamp(null)}
            onOpenDossier={() => { if (openCamp) { setDossierCampId(openCamp.id); setOpenCamp(null) } }}
          />
        </Suspense>
      )}
      {dossierCampId && (
        <Suspense fallback={null}>
          <CampDossierModal campId={dossierCampId} onClose={() => setDossierCampId(null)} />
        </Suspense>
      )}
    </div>
  )
}

export default MyCampScheduleTab
