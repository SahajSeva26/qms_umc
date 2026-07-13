export interface HorizontalBar {
  label: string
  value: number
  formattedValue: string
}

interface BarsHorizontalProps {
  bars: HorizontalBar[]
  gradient?: string
}

// Same shape as the dashboard module's BarListRow, kept as a separate
// component here (not a cross-feature import) since features communicate
// only through shared types/hooks/lib/components-ui, not each other's
// feature-local components.
const BarsHorizontal = ({ bars, gradient = 'linear-gradient(90deg, var(--chart-1), var(--chart-2))' }: BarsHorizontalProps) => {
  const maxValue = Math.max(1, ...bars.map((b) => b.value))

  return (
    <div className="space-y-1">
      {bars.map((b) => (
        <div key={b.label} className="grid grid-cols-[minmax(0,140px)_1fr_auto] gap-3 items-center py-1.5">
          <div className="text-[12px] font-semibold truncate" style={{ color: 'var(--qms-text)' }}>{b.label}</div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--qms-surface-strong)' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(2, (b.value / maxValue) * 100)}%`, background: gradient }}
            />
          </div>
          <div className="text-[12px] font-bold shrink-0 tabular-nums" style={{ color: 'var(--qms-text)' }}>{b.formattedValue}</div>
        </div>
      ))}
      {bars.length === 0 && (
        <p className="text-[12px] py-2" style={{ color: 'var(--qms-text-muted)' }}>No data.</p>
      )}
    </div>
  )
}

export default BarsHorizontal
