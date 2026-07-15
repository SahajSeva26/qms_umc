import type { IconType } from 'react-icons'

export type KpiTone = 'brand' | 'teal' | 'emerald' | 'amber' | 'rose' | 'violet'

// Mirrors the prototype's .kpi/.kpi.tone tiles exactly (styles.css lines
// 449-489) — the colored corner glow-blob is a blurred ::after circle at 18%
// opacity, one of 6 fixed tones assigned per what the metric means.
export const KPI_TONE_COLOR: Record<KpiTone, string> = {
  brand: '#3b6dff',
  teal: '#14b8a6',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#8b5cf6',
}

interface KpiTileProps {
  label: string
  value: string
  sub?: string
  tone: KpiTone
  icon: IconType
}

const KpiTile = ({ label, value, sub, tone, icon: Icon }: KpiTileProps) => {
  const color = KPI_TONE_COLOR[tone]
  return (
    <div
      className="relative rounded-xl border p-3.5 overflow-hidden transition-transform hover:-translate-y-0.5"
      style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', backdropFilter: 'blur(20px) saturate(140%)' }}
    >
      <div
        className="absolute rounded-full pointer-events-none"
        style={{ right: -30, top: -30, width: 140, height: 140, opacity: 0.18, filter: 'blur(30px)', background: color }}
      />
      <div className="relative flex items-center gap-2 mb-1.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, rgba(36,81,240,.16), rgba(20,184,166,.16))', border: '1px solid var(--qms-border-strong)', color: 'var(--qms-brand)' }}
        >
          <Icon size={14} />
        </div>
        <div className="text-[11px] font-semibold uppercase tracking-wide truncate" style={{ color: 'var(--qms-text-muted)' }}>
          {label}
        </div>
      </div>
      <div className="relative text-[22px] font-extrabold leading-tight mb-0.5" style={{ color: 'var(--qms-text)', letterSpacing: '-0.02em' }}>
        {value}
      </div>
      {sub && (
        <div className="relative text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{sub}</div>
      )}
    </div>
  )
}

export default KpiTile
