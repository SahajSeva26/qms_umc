import type { IconType } from 'react-icons'
import { KPI_TONE_COLOR, type KpiTone } from '@/components/ui/KpiTile'

interface SalesDashboardKpiTileProps {
  label: string
  value: string
  sub?: string
  tone: KpiTone
  icon: IconType
}

// Matches the Sales Dashboard's runtime-injected #salesKpis .kpi override (sales.js:448-463):
// tighter padding (11px 12px vs the base KpiTile's 13px 14px), smaller value (21px vs 22px), a
// lighter/faster hover. Kept local to this feature (not a `compact` prop on the shared KpiTile)
// since this dashboard is its only consumer — promote back to components/ui only if a second
// feature genuinely needs the same compact variant.
const SalesDashboardKpiTile = ({ label, value, sub, tone, icon: Icon }: SalesDashboardKpiTileProps) => {
  const color = KPI_TONE_COLOR[tone]
  return (
    <div
      className="relative rounded-xl border overflow-hidden transition-transform"
      style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', backdropFilter: 'blur(20px) saturate(140%)', padding: '11px 12px', transition: '.12s' }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 18px rgba(15,23,42,.12)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}
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
      <div className="relative font-extrabold leading-tight mb-0.5 text-[21px]" style={{ color: 'var(--qms-text)', letterSpacing: '-0.02em' }}>
        {value}
      </div>
      {sub && (
        <div className="relative text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{sub}</div>
      )}
    </div>
  )
}

export default SalesDashboardKpiTile
