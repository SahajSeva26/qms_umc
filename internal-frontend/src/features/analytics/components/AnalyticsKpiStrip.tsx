import type { IconType } from 'react-icons'
import { FiBriefcase, FiFolder, FiHome, FiUsers, FiStar, FiCreditCard, FiAlertTriangle, FiMap, FiActivity } from 'react-icons/fi'
import type { AnalyticsKpiTile } from '@/features/analytics/analytics.kpis'
import KpiTile, { type KpiTone } from '@/components/ui/KpiTile'

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

// Mirrors the prototype's .kpi-grid exactly (styles.css line 444) — a FIXED
// 4-column grid, not an auto-fill pack. Breakpoints match the source 1:1.
const AnalyticsKpiStrip = ({ tiles }: AnalyticsKpiStripProps) => (
  <div
    className="grid gap-2.5 mb-4 grid-cols-4 max-[1300px]:grid-cols-3 max-[980px]:grid-cols-2 max-[560px]:grid-cols-1"
  >
    {tiles.map((tile) => (
      <KpiTile
        key={tile.id}
        label={tile.label}
        value={tile.value}
        sub={tile.sub}
        tone={tile.tone as KpiTone}
        icon={ICON_MAP[tile.icon] ?? FiActivity}
      />
    ))}
  </div>
)

export default AnalyticsKpiStrip
