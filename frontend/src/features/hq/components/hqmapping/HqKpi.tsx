import type { IconType } from 'react-icons'

// Exact port of hq-serviceability.js's kpi() helper + .hq-kpi/.hq-kpi.{tone}
// CSS (lines 37-50) — a KPI tile toned by HqTier color rather than KpiTile's
// fixed 6-tone palette (brand/teal/emerald/amber/rose/violet), since these
// KPIs report literal GREEN/YELLOW/ORANGE/RED HQ counts and must use the same
// color tokens as the status pills, not a generic accent.
export type HqKpiTone = 'green' | 'yellow' | 'orange' | 'red' | 'blue' | 'none'

const TONE_COLOR: Record<Exclude<HqKpiTone, 'none'>, { bg: string; fg: string; value: string }> = {
  green: { bg: 'rgba(16,185,129,.16)', fg: '#047857', value: '#047857' },
  yellow: { bg: 'rgba(245,158,11,.18)', fg: '#92400e', value: 'var(--qms-text)' },
  orange: { bg: 'rgba(249,115,22,.18)', fg: '#c2410c', value: 'var(--qms-text)' },
  red: { bg: 'rgba(244,63,94,.16)', fg: '#b91c1c', value: '#b91c1c' },
  blue: { bg: 'rgba(59,109,255,.14)', fg: '#1d4ed8', value: 'var(--qms-text)' },
}

interface HqKpiProps {
  label: string
  value: string | number
  sub?: string
  icon: IconType
  tone?: HqKpiTone
}

const HqKpi = ({ label, value, sub, icon: Icon, tone = 'none' }: HqKpiProps) => {
  const t = tone === 'none' ? null : TONE_COLOR[tone]
  return (
    <div className="relative rounded-xl border p-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
      <div
        className="absolute top-2.5 right-2.5 w-[30px] h-[30px] rounded-lg grid place-items-center"
        style={{ background: t ? t.bg : 'rgba(124,92,255,.12)', color: t ? t.fg : '#6d28d9' }}
      >
        <Icon size={14} />
      </div>
      <div className="text-[10.5px] uppercase font-bold tracking-wide pr-9" style={{ color: 'var(--qms-text-muted)' }}>{label}</div>
      <div className="text-2xl font-extrabold mt-1" style={{ color: t ? t.value : 'var(--qms-text)' }}>{value}</div>
      {sub && <div className="text-[10.5px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>{sub}</div>}
    </div>
  )
}

export default HqKpi
