import type { IconType } from 'react-icons'
import { FiInbox, FiCalendar, FiPlayCircle, FiCheckCircle, FiXCircle, FiAlertTriangle, FiList } from 'react-icons/fi'
import type { CampStatus } from '@/types/campReal.types'
import { CAMP_SCHEDULE_STATUS_PILL_LABEL } from '@/features/camps/campDashboardStatus'

export type CampManagementTab = CampStatus | 'ALL'

const TAB_ORDER: CampManagementTab[] = ['requested', 'confirmed', 'live', 'closed', 'cancelled', 'cancelled_charged', 'ALL']

const TAB_ICON: Record<CampManagementTab, IconType> = {
  requested: FiInbox,
  confirmed: FiCalendar,
  live: FiPlayCircle,
  closed: FiCheckCircle,
  cancelled: FiXCircle,
  cancelled_charged: FiAlertTriangle,
  ALL: FiList,
}

const TAB_LABEL_OVERRIDE: Partial<Record<CampManagementTab, string>> = {
  ALL: 'All Camps',
}

interface CampManagementTabStripProps {
  active: CampManagementTab
  onSelect: (tab: CampManagementTab) => void
}

// Mirrors internal-frontend's CampsTabStrip.tsx — status labels sourced from this app's own
// campDashboardStatus.ts (CAMP_SCHEDULE_STATUS_PILL_LABEL), confirmed to match internal-frontend's
// CAMP_STATUS_LABEL for all 6 statuses.
const CampManagementTabStrip = ({ active, onSelect }: CampManagementTabStripProps) => {
  return (
    <div className="flex overflow-x-auto mb-4" style={{ borderBottom: '1px solid var(--qms-border)' }}>
      {TAB_ORDER.map((tab) => {
        const Icon = TAB_ICON[tab]
        const isActive = active === tab
        const label = TAB_LABEL_OVERRIDE[tab] ?? (tab === 'ALL' ? 'All Camps' : CAMP_SCHEDULE_STATUS_PILL_LABEL[tab])
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

export default CampManagementTabStrip
