import { FiFolder, FiPlayCircle, FiPauseCircle, FiRefreshCw, FiAlertTriangle, FiClock, FiLayers } from 'react-icons/fi'
import type { ProjectKpis } from '@/types/project.types'

const TILES = [
  { key: 'total' as const, label: 'Projects', icon: FiFolder, color: 'var(--qms-brand)' },
  { key: 'live' as const, label: 'Live', icon: FiPlayCircle, color: '#10b981' },
  { key: 'hold' as const, label: 'On Hold', icon: FiPauseCircle, color: '#f59e0b' },
  { key: 'renewingIn30d' as const, label: 'Renewing 30d', icon: FiRefreshCw, color: '#7c3aed' },
  { key: 'atRisk' as const, label: 'At Risk', icon: FiAlertTriangle, color: '#f43f5e' },
  { key: 'overdue' as const, label: 'Overdue', icon: FiClock, color: '#f43f5e' },
  { key: 'totalCamps' as const, label: 'Total Camps', icon: FiLayers, color: 'var(--qms-teal)' },
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
  <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
    {TILES.map((tile) => (
      <div key={tile.key} className="rounded-2xl border p-3.5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
          <tile.icon size={12} style={{ color: tile.color }} />
          {tile.label}
        </div>
        <div className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>{kpis[tile.key]}</div>
        <div className="text-[11px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>{subLabel(tile.key, kpis)}</div>
      </div>
    ))}
  </div>
)

export default GanttKpiStrip
