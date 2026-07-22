import type { IconType } from 'react-icons'
import { FiTrendingUp, FiBriefcase, FiCheckCircle, FiTarget, FiDollarSign, FiActivity } from 'react-icons/fi'
import type { KpiTile } from '@/types/crm.types'
import { formatINR, formatPercent } from '@/utils/formatters'

const ICON_MAP: Record<string, IconType> = {
  TrendingUp: FiTrendingUp,
  Briefcase: FiBriefcase,
  CheckCircle: FiCheckCircle,
  Target: FiTarget,
  DollarSign: FiDollarSign,
}

function formatValue(tile: KpiTile): string {
  if (tile.fmt === 'inr') return formatINR(Number(tile.value))
  if (tile.fmt === 'pct') return formatPercent(Number(tile.value), 1)
  return Number(tile.value).toLocaleString('en-IN')
}

interface CrmKpiStripProps {
  tiles: KpiTile[]
  onDrill: (tile: KpiTile) => void
}

// No delta/trend badge — there's no previous-period comparison available
// from the real backend (the old mock strip's +/-% deltas were fabricated
// numbers with no data source), so tiles show the live value only.
const CrmKpiStrip = ({ tiles, onDrill }: CrmKpiStripProps) => (
  <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
    {tiles.map((tile) => {
      const Icon = ICON_MAP[tile.icon] ?? FiActivity
      return (
        <button
          key={tile.id}
          onClick={() => onDrill(tile)}
          className="text-left rounded-xl border p-3 transition-all hover:-translate-y-0.5"
          style={{ background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)' }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--qms-text-muted)' }}>
              {tile.label}
            </span>
            <Icon size={13} style={{ color: 'var(--qms-text-muted)' }} />
          </div>
          <div className="text-[20px] font-extrabold tracking-tight" style={{ color: 'var(--qms-text)' }}>
            {formatValue(tile)}
          </div>
        </button>
      )
    })}
  </div>
)

export default CrmKpiStrip
