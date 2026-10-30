import { useState } from 'react'
import { FiCalendar } from 'react-icons/fi'
import { usePharmaMyCamps } from '@/features/pharma/hooks/usePharmaMyCamps'
import MrCampScheduleTable from '@/features/pharma/components/MrCampScheduleTable'
import PharmaCampDetailDrawer from '@/features/pharma/components/PharmaCampDetailDrawer'
import CampDossierModal from '@/features/pharma/components/dossier/CampDossierModal'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import PaginationControls from '@/components/ui/PaginationControls'
import { usePagination } from '@/hooks/usePagination'
import { CAMP_SCHEDULE_STATUS_TABS } from '@/features/pharma/campDashboardStatus'
import type { CampEntity, CampStatus } from '@/types/campReal.types'

const PAGE_SIZE = 10

type ScheduleTab = CampStatus | 'all'
// Exact DOM order + labels from the prototype's statusTabs array: All, Requested, Ongoing
// (live), Upcoming (confirmed), Completed (closed), Cancelled, Cancelled but charged.
const TAB_ORDER: ScheduleTab[] = ['all', ...CAMP_SCHEDULE_STATUS_TABS.map((t) => t.value)]
const TAB_LABEL: Record<ScheduleTab, string> = {
  all: 'All',
  ...Object.fromEntries(CAMP_SCHEDULE_STATUS_TABS.map((t) => [t.value, t.label])),
} as Record<ScheduleTab, string>
const tabLabel = (tab: ScheduleTab) => TAB_LABEL[tab]

// Real GET /camps/my, not a mock — field-force's own camps across every project, with a
// server-computed status/type summary (CampSummary) independent of the current page/filter.
const MyCampScheduleTab = () => {
  const [activeTab, setActiveTab] = useState<ScheduleTab>('all')
  const [openCamp, setOpenCamp] = useState<CampEntity | null>(null)
  const [dossierCampId, setDossierCampId] = useState<string | null>(null)
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)

  const { data, isLoading, error, refetch } = usePharmaMyCamps({
    status: activeTab === 'all' ? undefined : activeTab,
    page: String(page),
    limit: String(PAGE_SIZE),
  })
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

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading your camps…" errorLabel="Failed to load your camps. Please try again." onRetry={refetch}>
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
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
      </QueryStateBlock>

      <PharmaCampDetailDrawer
        camp={openCamp}
        onClose={() => setOpenCamp(null)}
        onOpenDossier={() => { if (openCamp) { setDossierCampId(openCamp.id); setOpenCamp(null) } }}
      />
      <CampDossierModal campId={dossierCampId} onClose={() => setDossierCampId(null)} />
    </div>
  )
}

export default MyCampScheduleTab
