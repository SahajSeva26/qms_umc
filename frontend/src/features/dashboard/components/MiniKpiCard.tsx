import { FiArrowUp, FiArrowDown } from 'react-icons/fi'
import { formatINR, formatPercent } from '@/utils/formatters'
import type { KpiValue } from '@/types/dashboard.types'

interface MiniKpiCardProps {
  label: string
  data: KpiValue
  suffix?: string
  onClick?: () => void
}

function formatValue(v: number, unit?: KpiValue['unit']): string {
  if (unit === 'inr') return formatINR(v)
  if (unit === 'pct') return formatPercent(v, 1)
  return v.toLocaleString('en-IN')
}

function deltaPct(v: number, ly?: number): number | null {
  if (ly === undefined || ly === 0) return null
  return ((v - ly) / ly) * 100
}

const MiniKpiCard = ({ label, data, suffix, onClick }: MiniKpiCardProps) => {
  const delta = deltaPct(data.v, data.ly)
  const isUp = (delta ?? 0) >= 0

  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border p-3 transition-all hover:-translate-y-0.5"
      style={{ background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)' }}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>
        {label}
      </div>
      <div className="text-[22px] font-extrabold tracking-tight mb-1.5" style={{ color: 'var(--qms-text)' }}>
        {formatValue(data.v, data.unit)}
        {suffix && <span className="text-xs font-medium ml-1" style={{ color: 'var(--qms-text-muted)' }}>{suffix}</span>}
      </div>
      {delta !== null && (
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
            isUp ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
          }`}
        >
          {isUp ? <FiArrowUp size={10} /> : <FiArrowDown size={10} />}
          {formatPercent(Math.abs(delta), 1)} vs LY
        </span>
      )}
    </button>
  )
}

export default MiniKpiCard
