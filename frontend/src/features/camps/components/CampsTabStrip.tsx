import type { IconType } from 'react-icons'
import { FiInbox, FiCalendar, FiPlayCircle, FiCheckCircle, FiXCircle, FiAlertTriangle, FiList } from 'react-icons/fi'
import type { CampStatus } from '@/types/campReal.types'
import { CAMP_STATUS_LABEL } from '@/features/camps/components/CampStatusPillReal'

// Prototype's 9-tab strip (camps.html:51-61) — "Completed · Data Pending" and "Tele Consultation"
// have no real equivalent here (see md-files/ui-revisions.md); the other 7 tabs, incl. "All Camps", are kept.
export type CampsTab = CampStatus | 'ALL'

const TAB_ORDER: CampsTab[] = ['requested', 'confirmed', 'live', 'closed', 'cancelled', 'cancelled_charged', 'ALL']

const TAB_ICON: Record<CampsTab, IconType> = {
  requested: FiInbox,
  confirmed: FiCalendar,
  live: FiPlayCircle,
  closed: FiCheckCircle,
  cancelled: FiXCircle,
  cancelled_charged: FiAlertTriangle,
  ALL: FiList,
}

const TAB_LABEL_OVERRIDE: Partial<Record<CampsTab, string>> = {
  confirmed: 'Upcoming',
  closed: 'Completed',
  ALL: 'All Camps',
}

interface CampsTabStripProps {
  active: CampsTab
  onSelect: (tab: CampsTab) => void
}

// Prototype's .page-tabs/.page-tab (styles.css:1155-1178) — horizontally-scrollable row,
// bottom-border active indicator in brand color, no background fill on the active tab.
const CampsTabStrip = ({ active, onSelect }: CampsTabStripProps) => {
  return (
    <div className="flex overflow-x-auto mb-4" style={{ borderBottom: '1px solid var(--qms-border)' }}>
      {TAB_ORDER.map((tab) => {
        const Icon = TAB_ICON[tab]
        const isActive = active === tab
        const label = TAB_LABEL_OVERRIDE[tab] ?? (tab === 'ALL' ? 'All Camps' : CAMP_STATUS_LABEL[tab])
        return (
          <button
            key={tab}
            onClick={() => onSelect(tab)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold whitespace-nowrap shrink-0 transition-colors"
            style={{
              color: isActive ? 'var(--qms-text)' : 'var(--qms-text-muted)',
              borderBottom: `2px solid ${isActive ? 'var(--qms-brand)' : 'transparent'}`,
              marginBottom: '-1px',
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        )
      })}
    </div>
  )
}

export default CampsTabStrip
