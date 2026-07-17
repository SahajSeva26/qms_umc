import type { Camp, CampStage } from '@/types/camp.types'
import { campStage } from '@/features/camps/camps.utils'

const TONE_COLOR: Record<CampStage, string> = {
  REQUESTED: '#f59e0b',
  UPCOMING: '#3b6dff',
  LIVE: '#10b981',
  COMPLETED: '#14b8a6',
  COMPLETED_PENDING: '#f97316',
  CANCELLED: '#94a3b8',
  CANCELLED_CHARGED: '#ef4444',
}

const STAGE_LABEL: Record<CampStage, string> = {
  REQUESTED: 'Requested',
  UPCOMING: 'Upcoming',
  LIVE: 'Live',
  COMPLETED: 'Completed',
  COMPLETED_PENDING: 'Completed · Pending',
  CANCELLED: 'Cancelled',
  CANCELLED_CHARGED: 'Cancelled · Charged',
}

const STAGES: CampStage[] = ['REQUESTED', 'UPCOMING', 'LIVE', 'COMPLETED', 'COMPLETED_PENDING', 'CANCELLED', 'CANCELLED_CHARGED']

interface CampsKpiStripProps {
  camps: Camp[]
  activeTab: string
  onSelectTab: (tab: CampStage) => void
}

const CampsKpiStrip = ({ camps, activeTab, onSelectTab }: CampsKpiStripProps) => {
  const counts = STAGES.reduce((acc, stage) => {
    acc[stage] = camps.filter((c) => campStage(c) === stage).length
    return acc
  }, {} as Record<CampStage, number>)

  return (
    <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
      {STAGES.map((stage) => (
        <button
          key={stage}
          onClick={() => onSelectTab(stage)}
          className="text-left rounded-xl p-3 border-l-4 transition-all hover:-translate-y-0.5"
          style={{
            background: 'var(--qms-surface-strong)',
            borderLeftColor: TONE_COLOR[stage],
            outline: activeTab === stage ? `1px solid ${TONE_COLOR[stage]}` : 'none',
          }}
        >
          <div className="text-lg font-extrabold tabular-nums" style={{ color: 'var(--qms-text)' }}>{counts[stage]}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--qms-text-muted)' }}>
            {STAGE_LABEL[stage]}
          </div>
        </button>
      ))}
    </div>
  )
}

export default CampsKpiStrip
