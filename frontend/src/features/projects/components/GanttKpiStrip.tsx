import { FiFolder, FiPlayCircle, FiPauseCircle, FiRefreshCw, FiAlertTriangle, FiClock, FiLayers } from 'react-icons/fi'
import type { ProjectKpis } from '@/types/project.types'
import KpiTile, { type KpiTone } from '@/components/ui/KpiTile'

// Tones match the prototype's gantt.js `cards` array exactly (line 283-289).
const TILES = [
  { key: 'total' as const, label: 'Projects', icon: FiFolder, tone: 'brand' as KpiTone },
  { key: 'live' as const, label: 'Live', icon: FiPlayCircle, tone: 'teal' as KpiTone },
  { key: 'hold' as const, label: 'On Hold', icon: FiPauseCircle, tone: 'amber' as KpiTone },
  { key: 'renewingIn30d' as const, label: 'Renewing 30d', icon: FiRefreshCw, tone: 'violet' as KpiTone },
  { key: 'atRisk' as const, label: 'At Risk', icon: FiAlertTriangle, tone: 'rose' as KpiTone },
  { key: 'overdue' as const, label: 'Overdue', icon: FiClock, tone: 'rose' as KpiTone },
  { key: 'totalCamps' as const, label: 'Total Camps', icon: FiLayers, tone: 'brand' as KpiTone },
]

function subLabel(key: keyof ProjectKpis, kpis: ProjectKpis): string {
  switch (key) {
    case 'total':
      return `${kpis.live} live · ${kpis.closed} closed`
    case 'hold':
      return 'Awaiting unblock'
    case 'renewingIn30d':
      return 'Decision required'
    case 'atRisk':
      return 'Health < 75'
    case 'overdue':
      return 'Past end date'
    case 'totalCamps':
      return `${kpis.closedCamps} closed`
    default:
      return ''
  }
}

interface GanttKpiStripProps {
  kpis: ProjectKpis
}

const GanttKpiStrip = ({ kpis }: GanttKpiStripProps) => (
  <div className="grid gap-2.5 mb-4 grid-cols-4 max-[1300px]:grid-cols-3 max-[980px]:grid-cols-2 max-[560px]:grid-cols-1">
    {TILES.map((tile) => (
      <KpiTile
        key={tile.key}
        label={tile.label}
        value={String(kpis[tile.key])}
        sub={subLabel(tile.key, kpis)}
        tone={tile.tone}
        icon={tile.icon}
      />
    ))}
  </div>
)

export default GanttKpiStrip
