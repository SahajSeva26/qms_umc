import { formatINR, formatPercent } from '@/utils/formatters'
import type { KpiValue } from '@/types/dashboard.types'

interface MiniKpiCardProps {
  label: string
  data: KpiValue
  suffix?: string
}

function formatValue(v: number, unit?: KpiValue['unit']): string {
  if (unit === 'inr') return formatINR(v)
  if (unit === 'pct') return formatPercent(v, 1)
  return v.toLocaleString('en-IN')
}

// Non-interactive — no Dashboard caller wires navigation/drill-down today.
const MiniKpiCard = ({ label, data, suffix }: MiniKpiCardProps) => {
  return (
    <div
      className="rounded-xl border p-3"
      style={{ background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)' }}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>
        {label}
      </div>
      <div className="text-[22px] font-extrabold tracking-tight" style={{ color: 'var(--qms-text)' }}>
        {data.v === null ? '-' : formatValue(data.v, data.unit)}
        {data.v !== null && suffix && <span className="text-xs font-medium ml-1" style={{ color: 'var(--qms-text-muted)' }}>{suffix}</span>}
      </div>
    </div>
  )
}

export default MiniKpiCard
