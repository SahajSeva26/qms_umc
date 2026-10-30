// Mirrors the prototype's .do-bar progress bar (thin, colored fill).
const DoBar = ({ pct, color = 'var(--qms-brand)' }: { pct: number; color?: string }) => (
  <div className="h-1.5 rounded-full overflow-hidden w-full" style={{ background: 'var(--qms-surface-strong)' }}>
    <span className="block h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }} />
  </div>
)

export default DoBar
