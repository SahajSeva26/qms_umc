import type { IconType } from 'react-icons'
import { FiBriefcase, FiCheckCircle, FiXCircle, FiTarget, FiActivity, FiDollarSign, FiClock } from 'react-icons/fi'
import type { KpiTile as KpiTileData } from '@/types/crm.types'
import { formatINR, formatPercent } from '@/utils/formatters'
import KpiTile, { type KpiTone } from '@/components/ui/KpiTile'

const ICON_MAP: Record<string, IconType> = {
  Briefcase: FiBriefcase,
  CheckCircle: FiCheckCircle,
  XCircle: FiXCircle,
  Target: FiTarget,
  DollarSign: FiDollarSign,
  Clock: FiClock,
}

// tile.tone (crm.kpis.ts) already uses the prototype's own tone names
// (violet/emerald/rose/teal) — KpiTone accepts them directly.
function toTone(tone: string): KpiTone {
  return (['brand', 'teal', 'emerald', 'amber', 'rose', 'violet'] as const).includes(tone as KpiTone)
    ? (tone as KpiTone)
    : 'brand'
}

function formatValue(tile: KpiTileData): string {
  if (tile.fmt === 'inr') return formatINR(Number(tile.value))
  if (tile.fmt === 'pct') return formatPercent(Number(tile.value), 1)
  return Number(tile.value).toLocaleString('en-IN')
}

interface CrmKpiStripProps {
  tiles: KpiTileData[]
}

// Reuses the shared KpiTile (prototype's .kpi/.kpi.tone glow-blob tile,
// components/ui/KpiTile.tsx) instead of a bespoke flat card, matching the
// prototype's #crmKpis grid (auto-fill,minmax(170px,1fr)). No delta badge
// (no period-over-period comparison source) and not clickable (a
// tenant-wide aggregate has no matching page-scoped drill-down).
const CrmKpiStrip = ({ tiles }: CrmKpiStripProps) => (
  <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
    {tiles.map((tile) => (
      <KpiTile
        key={tile.id}
        label={tile.label}
        value={formatValue(tile)}
        tone={toTone(tile.tone)}
        icon={ICON_MAP[tile.icon] ?? FiActivity}
      />
    ))}
  </div>
)

export default CrmKpiStrip
