import { useEffect, useMemo, useState } from 'react'
import { FiPlus, FiUpload } from 'react-icons/fi'
import type { CampStage } from '@/types/camp.types'
import { useCamps } from '@/features/camps/hooks/useCamps'
import { useCampsFilters } from '@/features/camps/hooks/useCampsFilters'
import { campStage } from '@/features/camps/camps.utils'
import { matchesFilters } from '@/features/camps/camps.filter'
import { FO_NAMES } from '@/features/camps/camps.refs'
import CampsKpiStrip from '@/features/camps/components/CampsKpiStrip'
import CampsFilterBar from '@/features/camps/components/CampsFilterBar'
import CampCard from '@/features/camps/components/CampCard'
import CampTable from '@/features/camps/components/CampTable'
import CampDrawer from '@/features/camps/components/CampDrawer'
import CampWizard from '@/features/camps/components/CampWizard'
import BulkUploadCampsModal from '@/features/camps/components/BulkUploadCampsModal'
import { useAuth } from '@/hooks/useAuth'

type TabId = CampStage | 'TELE' | 'ALL'

const TABS: { id: TabId; label: string; view: 'cards' | 'table' }[] = [
  { id: 'REQUESTED', label: 'Requested', view: 'cards' },
  { id: 'UPCOMING', label: 'Upcoming', view: 'cards' },
  { id: 'LIVE', label: 'Live', view: 'cards' },
  { id: 'COMPLETED', label: 'Completed', view: 'table' },
  { id: 'COMPLETED_PENDING', label: 'Completed · Data Pending', view: 'cards' },
  { id: 'CANCELLED', label: 'Cancelled', view: 'table' },
  { id: 'CANCELLED_CHARGED', label: 'Cancelled · Charged', view: 'table' },
  { id: 'TELE', label: 'Teleconsultation', view: 'cards' },
  { id: 'ALL', label: 'All Camps', view: 'table' },
]

interface CampsPageProps {
  /** Locks the page to a single tab and hides the tab bar — used by the
   * Teleconsultation Camps screen, which is a filtered view of this same
   * feature (matches the prototype's tele-camps.html, which reuses camps.js
   * with setCampsTab('tele') instead of being a separate module). */
  lockTab?: TabId
  title?: string
  subtitle?: string
}

const CampsPage = ({ lockTab, title, subtitle }: CampsPageProps = {}) => {
  const { user } = useAuth()
  const isFo = user?.role === 'fo' || user?.role === 'dedicated_fo'
  const { camps, setStatus, assignFo, toggleTele } = useCamps()
  const { filters, setFilter, reset } = useCampsFilters()
  const [activeTab, setActiveTab] = useState<TabId>(lockTab ?? 'LIVE')
  const [openCampId, setOpenCampId] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false)

  // lockTab is only used as the initial useState value above, so navigating
  // client-side between routes sharing this component (e.g. /camps ->
  // /camps/tele) without an unmount doesn't re-seed it — sync explicitly.
  useEffect(() => {
    if (lockTab) setActiveTab(lockTab)
  }, [lockTab])

  const scopedCamps = useMemo(() => {
    // Role-scoping: an FO only sees their own camps. Coordinator/KAM scoping
    // is deferred until a real people/assignments module exists to scope against.
    if (isFo && user) return camps.filter((c) => c.foId && FO_NAMES[c.foId] && c.foId === user._id)
    return camps
  }, [camps, isFo, user])

  const filtered = useMemo(() => scopedCamps.filter((c) => matchesFilters(c, filters)), [scopedCamps, filters])

  const tabCamps = useMemo(() => {
    // Mirrors the prototype's tab filter exactly (camps.js: case 'tele' checks
    // camp.teleConsult independent of the 7 status-stage buckets, 'all' shows
    // everything, every other tab id is a status-stage bucket).
    const list =
      activeTab === 'ALL' ? filtered
      : activeTab === 'TELE' ? filtered.filter((c) => !!c.teleConsult)
      : filtered.filter((c) => campStage(c) === activeTab)
    return [...list].sort((a, b) => a.date.localeCompare(b.date))
  }, [filtered, activeTab])

  const activeTabMeta = TABS.find((t) => t.id === activeTab)
  const openCamp = camps.find((c) => c.id === openCampId) ?? null

  const handleAssignFo = (id: string) => {
    const name = window.prompt('Assign FO — enter FO id (e.g. p-ravi, p-anita, p-amit, p-pooja):')
    if (name) assignFo(id, name.trim())
  }

  const handleQuickCancel = (id: string) => setOpenCampId(id)

  return (
    <div className="max-w-7xl">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>
            {title ?? (isFo ? 'My Camps' : 'Camp Management')}
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
            {subtitle ?? (isFo ? 'Operations · My assigned camps' : 'Operations · Camp Management')}
          </p>
        </div>
        {!isFo && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setBulkUploadOpen(true)}
              className="flex items-center gap-1.5 text-[13px] font-bold px-3.5 py-2 rounded-xl border"
              style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}
            >
              <FiUpload size={14} /> Bulk upload
            </button>
            <button
              onClick={() => setWizardOpen(true)}
              className="flex items-center gap-1.5 text-[13px] font-bold px-3.5 py-2 rounded-xl text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
            >
              <FiPlus size={14} /> New Camp
            </button>
          </div>
        )}
      </div>

      {/* Per confirmed audit finding: the prototype's tele-camps.html shows
          the KPI strip even on the locked Tele view, so it must always
          render regardless of lockTab. */}
      <CampsKpiStrip
        camps={scopedCamps}
        activeTab={activeTab}
        onSelectTab={(stage) => setActiveTab(stage)}
      />

      {lockTab ? (
        <div className="flex flex-wrap gap-1 mb-3 border-b" style={{ borderColor: 'var(--qms-border)' }}>
          <button
            className="px-3.5 py-2.5 text-[13px] font-semibold border-b-2"
            style={{ color: 'var(--qms-text)', borderBottomColor: 'var(--qms-brand)' }}
          >
            {TABS.find((t) => t.id === lockTab)?.label}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1 mb-3 border-b" style={{ borderColor: 'var(--qms-border)' }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-3.5 py-2.5 text-[13px] font-semibold border-b-2 transition-colors"
              style={{
                color: activeTab === tab.id ? 'var(--qms-text)' : 'var(--qms-text-muted)',
                borderBottomColor: activeTab === tab.id ? 'var(--qms-brand)' : 'transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <CampsFilterBar filters={filters} setFilter={setFilter} reset={reset} />

      <div className="text-[12px] mb-3" style={{ color: 'var(--qms-text-muted)' }}>
        {tabCamps.length} camp{tabCamps.length === 1 ? '' : 's'} in this view
      </div>

      {activeTabMeta?.view === 'cards' ? (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))' }}>
          {tabCamps.map((camp) => (
            <CampCard
              key={camp.id}
              camp={camp}
              onOpen={setOpenCampId}
              onAssignFo={handleAssignFo}
              onQuickCancel={handleQuickCancel}
            />
          ))}
          {tabCamps.length === 0 && (
            <div className="col-span-full text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
              No camps in this view.
            </div>
          )}
        </div>
      ) : (
        <CampTable camps={tabCamps} onOpen={setOpenCampId} />
      )}

      <CampDrawer
        camp={openCamp}
        onClose={() => setOpenCampId(null)}
        onSetStatus={setStatus}
        onAssignFo={handleAssignFo}
        onToggleTele={toggleTele}
      />

      <CampWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
      <BulkUploadCampsModal open={bulkUploadOpen} onClose={() => setBulkUploadOpen(false)} />
    </div>
  )
}

export default CampsPage
