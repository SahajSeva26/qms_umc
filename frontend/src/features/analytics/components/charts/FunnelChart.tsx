import { formatINR } from '@/utils/formatters'

export interface FunnelRow {
  label: string
  count: number
  value: number
  color: string
}

interface FunnelChartProps {
  rows: FunnelRow[]
}

// Bespoke pipeline funnel — one row per stage, bar width proportional to the
// largest stage's count. The count/value label sits inside the bar when
// there's room, otherwise after it — a narrow bar (e.g. the Won/Loss stages
// with few leads) must never clip or hide the label.
const FunnelChart = ({ rows }: FunnelChartProps) => {
  const maxCount = Math.max(1, ...rows.map((r) => r.count))
  const totalCount = rows.reduce((sum, r) => sum + r.count, 0)
  // Below this width the inline label would clip — render it after the bar instead.
  const LABEL_FITS_THRESHOLD = 30

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const widthPct = Math.max(4, (row.count / maxCount) * 100)
        const sharePct = totalCount > 0 ? Math.round((row.count / totalCount) * 100) : 0
        const labelFits = widthPct >= LABEL_FITS_THRESHOLD
        const valueLabel = `${row.count} · ${formatINR(row.value)}`
        return (
          <div key={row.label} className="flex items-center gap-3">
            <span className="text-[11px] font-semibold w-28 shrink-0 truncate" style={{ color: 'var(--qms-text-muted)' }}>
              {row.label}
            </span>
            <div className="flex-1 h-7 rounded-lg overflow-hidden relative flex items-center" style={{ background: 'var(--qms-surface-strong)' }}>
              <div className="h-full rounded-lg flex items-center px-2" style={{ width: `${widthPct}%`, background: row.color }}>
                {labelFits && <span className="text-[11px] font-bold text-white truncate">{valueLabel}</span>}
              </div>
              {!labelFits && (
                <span className="text-[11px] font-bold ml-2 whitespace-nowrap" style={{ color: 'var(--qms-text)' }}>
                  {valueLabel}
                </span>
              )}
            </div>
            <span className="text-[11px] font-bold w-10 text-right shrink-0" style={{ color: 'var(--qms-text)' }}>
              {sharePct}%
            </span>
          </div>
        )
      })}
      {rows.length === 0 && (
        <p className="text-[12px] text-center py-4" style={{ color: 'var(--qms-text-muted)' }}>No leads for this period.</p>
      )}
    </div>
  )
}

export default FunnelChart
