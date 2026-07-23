import { FiFolder, FiPlayCircle, FiPauseCircle, FiXCircle, FiLayers, FiAlertTriangle, FiClock } from 'react-icons/fi'
import KpiTile, { type KpiTone } from '@/components/ui/KpiTile'

// overdue/renewingIn30d are derived from the real executionMode.poExpiry/
// .agreementEndDate dates (see projects.utils.ts's computeProjectKpis) —
// not the old mock's flat startDate/endDate, which never existed on the
// real backend model.
const TILES = [
  { key: 'total' as const, label: 'Projects', icon: FiFolder, tone: 'brand' as KpiTone },
  { key: 'live' as const, label: 'Live', icon: FiPlayCircle, tone: 'teal' as KpiTone },
  { key: 'hold' as const, label: 'On Hold', icon: FiPauseCircle, tone: 'amber' as KpiTone },
  { key: 'closed' as const, label: 'Closed', icon: FiXCircle, tone: 'rose' as KpiTone },
  { key: 'totalCamps' as const, label: 'Total Camps', icon: FiLayers, tone: 'brand' as KpiTone },
  { key: 'overdue' as const, label: 'Overdue Renewal', icon: FiAlertTriangle, tone: 'rose' as KpiTone },
  { key: 'renewingIn30d' as const, label: 'Renewing < 30d', icon: FiClock, tone: 'amber' as KpiTone },
]

interface GanttKpiStripProps {
  kpis: { total: number; live: number; hold: number; closed: number; totalCamps: number; overdue: number; renewingIn30d: number }
}

const GanttKpiStrip = ({ kpis }: GanttKpiStripProps) => (
  <div className="grid gap-2.5 mb-4 grid-cols-4 max-[1500px]:grid-cols-3 max-[1100px]:grid-cols-2 max-[560px]:grid-cols-1">
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
