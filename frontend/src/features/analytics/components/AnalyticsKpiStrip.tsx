import type { IconType } from 'react-icons'
import { FiBriefcase, FiFolder, FiHome, FiUsers, FiStar, FiCreditCard, FiAlertTriangle, FiMap, FiActivity } from 'react-icons/fi'
import type { AnalyticsKpiTile } from '@/features/analytics/analytics.kpis'

const ICON_MAP: Record<string, IconType> = {
  Briefcase: FiBriefcase,
  FolderOpen: FiFolder,
  Tent: FiHome,
  Users: FiUsers,
  Star: FiStar,
  Receipt: FiCreditCard,
  AlertTriangle: FiAlertTriangle,
  Route: FiMap,
}

interface AnalyticsKpiStripProps {
  tiles: AnalyticsKpiTile[]
}

const AnalyticsKpiStrip = ({ tiles }: AnalyticsKpiStripProps) => (
  <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
    {tiles.map((tile) => {
      const Icon = ICON_MAP[tile.icon] ?? FiActivity
      return (
        <div
          key={tile.id}
          className="rounded-xl border p-3"
          style={{ background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)' }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--qms-text-muted)' }}>
              {tile.label}
            </span>
            <Icon size={13} style={{ color: 'var(--qms-text-muted)' }} />
          </div>
          <div className="text-[19px] font-extrabold tracking-tight mb-1" style={{ color: 'var(--qms-text)' }}>
            {tile.value}
          </div>
          <span className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{tile.sub}</span>
        </div>
      )
    })}
  </div>
)

export default AnalyticsKpiStrip
