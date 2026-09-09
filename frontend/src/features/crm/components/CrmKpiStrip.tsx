import type { IconType } from 'react-icons'
import { FiBriefcase, FiCheckCircle, FiXCircle, FiTarget, FiActivity } from 'react-icons/fi'
import type { KpiTile } from '@/types/crm.types'
import { formatINR, formatPercent } from '@/utils/formatters'

const ICON_MAP: Record<string, IconType> = {
  Briefcase: FiBriefcase,
  CheckCircle: FiCheckCircle,
  XCircle: FiXCircle,
  Target: FiTarget,
}

function formatValue(tile: KpiTile): string {
  if (tile.fmt === 'inr') return formatINR(Number(tile.value))
  if (tile.fmt === 'pct') return formatPercent(Number(tile.value), 1)
  return Number(tile.value).toLocaleString('en-IN')
}

interface CrmKpiStripProps {
  tiles: KpiTile[]
}

// No delta badge (no period-over-period comparison exists) and not
// clickable (a tenant-wide aggregate has no matching page-scoped drill-down).
const CrmKpiStrip = ({ tiles }: CrmKpiStripProps) => (
  <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
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
          <div className="text-[20px] font-extrabold tracking-tight" style={{ color: 'var(--qms-text)' }}>
            {formatValue(tile)}
          </div>
        </div>
      )
    })}
  </div>
)

export default CrmKpiStrip
