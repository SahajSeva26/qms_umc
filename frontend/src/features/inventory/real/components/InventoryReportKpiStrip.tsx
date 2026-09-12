import type { IconType } from 'react-icons'
import KpiTile, { type KpiTone } from '@/components/ui/KpiTile'

export interface InventoryReportTile {
  key: string
  label: string
  value: string | number
  tone: KpiTone
  icon: IconType
}

// Static lookup, never a template-literal class name — Tailwind's build
// scans source files as plain text for literal class names, so a computed
// `lg:grid-cols-${n}` would silently vanish from the production CSS.
const GRID_COLS: Record<2 | 4 | 5, string> = {
  2: 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-2',
  4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
}

interface InventoryReportKpiStripProps {
  tiles: InventoryReportTile[]
  isLoading: boolean
  error: unknown
  canView: boolean
  /** Real eventual tile count — needed since `tiles` is still `[]` while loading. */
  skeletonCount: 2 | 4 | 5
}

const InventoryReportKpiStrip = ({ tiles, isLoading, error, canView, skeletonCount }: InventoryReportKpiStripProps) => {
  const gridCols = GRID_COLS[skeletonCount]

  if (!canView) {
    return (
      <div className="px-4 py-6 text-center text-[13px] rounded-xl border mb-4" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
        You don't have permission to view this overview.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={`grid gap-2.5 mb-4 ${gridCols}`}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border p-3 h-18 animate-pulse"
            style={{ background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)' }}
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <p className="text-[13px] mb-4" style={{ color: 'var(--qms-text-muted)' }}>
        Couldn't load overview.
      </p>
    )
  }

  return (
    <div className="mb-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--qms-text-muted)' }}>
        Organisation-wide overview — unaffected by list filters
      </p>
      <div className={`grid gap-2.5 ${gridCols}`}>
        {tiles.map((tile) => (
          <KpiTile key={tile.key} label={tile.label} value={String(tile.value)} tone={tile.tone} icon={tile.icon} />
        ))}
      </div>
    </div>
  )
}

export default InventoryReportKpiStrip
