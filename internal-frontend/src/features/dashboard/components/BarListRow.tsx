interface BarListRowProps {
  label: string
  sublabel?: string
  value: string
  share: number
  gradient?: string
}

// Non-interactive — no Dashboard caller wires navigation/drill-down today.
const BarListRow = ({ label, sublabel, value, share, gradient }: BarListRowProps) => (
  <div className="w-full grid grid-cols-[minmax(0,140px)_1fr_auto] gap-3 items-center py-2 rounded-lg px-1.5 -mx-1.5">
    <div className="min-w-0">
      <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--qms-text)' }}>{label}</div>
      {sublabel && <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{sublabel}</div>}
    </div>
    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--qms-surface-strong)' }}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.min(100, Math.max(0, share))}%`,
          background: gradient ?? 'linear-gradient(90deg, var(--qms-brand), var(--qms-teal))',
        }}
      />
    </div>
    <div className="text-[13px] font-bold shrink-0 tabular-nums" style={{ color: 'var(--qms-text)' }}>{value}</div>
  </div>
)

export default BarListRow
