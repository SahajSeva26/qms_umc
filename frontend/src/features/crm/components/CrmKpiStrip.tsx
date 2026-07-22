import type { IconType } from 'react-icons'
import { FiTrendingUp, FiBriefcase, FiCheckCircle, FiTarget, FiDollarSign, FiActivity, FiZap, FiAward, FiArrowUp, FiArrowDown } from 'react-icons/fi'
import type { KpiTile } from '@/types/lead.types'
import { formatINR, formatPercent } from '@/utils/formatters'

const ICON_MAP: Record<string, IconType> = {
  TrendingUp: FiTrendingUp,
  Briefcase: FiBriefcase,
  CheckCircle: FiCheckCircle,
  Target: FiTarget,
  DollarSign: FiDollarSign,
  Gauge: FiActivity,
  Zap: FiZap,
  Award: FiAward,
}

function formatValue(tile: KpiTile): string {
  if (tile.fmt === 'inr') return formatINR(Number(tile.value))
  if (tile.fmt === 'pct') return formatPercent(Number(tile.value), 1)
  if (tile.fmt === 'raw') return tile.id === 'vel' ? `${tile.value} days` : String(tile.value)
  return Number(tile.value).toLocaleString('en-IN')
}

interface CrmKpiStripProps {
  tiles: KpiTile[]
  onDrill: (tile: KpiTile) => void
}

const CrmKpiStrip = ({ tiles, onDrill }: CrmKpiStripProps) => (
  <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
    {tiles.map((tile) => {
      const Icon = ICON_MAP[tile.icon] ?? FiActivity
      const isUp = tile.delta >= 0
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
          <div className="text-[20px] font-extrabold tracking-tight mb-1" style={{ color: 'var(--qms-text)' }}>
            {formatValue(tile)}
          </div>
          {tile.sub ? (
            <span className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{tile.sub}</span>
          ) : (
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                isUp ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
              }`}
            >
              {isUp ? <FiArrowUp size={9} /> : <FiArrowDown size={9} />}
              {formatPercent(Math.abs(tile.delta), 1)}
            </span>
          )}
        </button>
      )
    })}
  </div>
)

export default CrmKpiStrip
