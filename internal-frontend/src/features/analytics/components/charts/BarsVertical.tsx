export interface VerticalBar {
  label: string
  value: number
  color: string
}

interface BarsVerticalProps {
  bars: VerticalBar[]
  formatValue?: (value: number) => string
}

const BarsVertical = ({ bars, formatValue = (v) => v.toLocaleString('en-IN') }: BarsVerticalProps) => {
  const maxValue = Math.max(1, ...bars.map((b) => b.value))

  return (
    <div className="flex items-end gap-4 h-40">
      {bars.map((b) => {
        const heightPct = Math.max(2, (b.value / maxValue) * 100)
        return (
          <div key={b.label} className="flex-1 flex flex-col items-center justify-end h-full gap-1.5" title={`${b.label}: ${formatValue(b.value)}`}>
            <span className="text-[11px] font-bold" style={{ color: 'var(--qms-text)' }}>{formatValue(b.value)}</span>
            <div className="w-full rounded-t-md" style={{ height: `${heightPct}%`, background: b.color, minHeight: 4 }} />
            <span className="text-[10px] truncate w-full text-center" style={{ color: 'var(--qms-text-muted)' }}>{b.label}</span>
          </div>
        )
      })}
      {bars.length === 0 && (
        <p className="text-[12px] w-full text-center self-center" style={{ color: 'var(--qms-text-muted)' }}>No data.</p>
      )}
    </div>
  )
}

export default BarsVertical
