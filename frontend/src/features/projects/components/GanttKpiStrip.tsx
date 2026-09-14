import { FiFolder, FiPlayCircle, FiPauseCircle, FiXCircle } from 'react-icons/fi'
import KpiTile, { type KpiTone } from '@/components/ui/KpiTile'

// Total Camps / Overdue Renewal / Renewing <30d were dropped — no backend
// aggregation exists for those figures.
const TILES = [
  { key: 'total' as const, label: 'Projects', icon: FiFolder, tone: 'brand' as KpiTone },
  { key: 'live' as const, label: 'Live', icon: FiPlayCircle, tone: 'teal' as KpiTone },
  { key: 'hold' as const, label: 'On Hold', icon: FiPauseCircle, tone: 'amber' as KpiTone },
  { key: 'closed' as const, label: 'Closed', icon: FiXCircle, tone: 'rose' as KpiTone },
]

interface GanttKpiStripProps {
  kpis: { total: number; live: number; hold: number; closed: number }
}

const GanttKpiStrip = ({ kpis }: GanttKpiStripProps) => (
  <div className="grid gap-2.5 mb-4 grid-cols-4 max-[1100px]:grid-cols-2 max-[560px]:grid-cols-1">
    {TILES.map((tile) => (
      <KpiTile
        key={tile.key}
        label={tile.label}
        value={String(kpis[tile.key])}
        tone={tile.tone}
        icon={tile.icon}
      />
    ))}
  </div>
)

export default GanttKpiStrip
