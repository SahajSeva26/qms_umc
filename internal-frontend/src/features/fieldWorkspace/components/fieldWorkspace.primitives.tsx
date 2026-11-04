import type { ReactNode } from 'react'
import type { IconType } from 'react-icons'

// Shared primitives for My FO Workspace — matches the prototype's .fop-* classes
// (fo-portal.js) exactly: card shell, KPI tile, status pill, camp row, empty state.

export type FopTone = '' | 'red' | 'yellow' | 'green' | 'blue' | 'violet'

const KPI_TONE_STYLE: Record<FopTone, { icon: string; value?: string }> = {
  '': { icon: 'rgba(20,184,166,.12)' },
  red: { icon: 'rgba(244,63,94,.14)', value: '#b91c1c' },
  yellow: { icon: 'rgba(245,158,11,.16)', value: '#92400e' },
  green: { icon: 'rgba(16,185,129,.16)', value: '#047857' },
  blue: { icon: 'rgba(59,109,255,.14)', value: '#1d4ed8' },
  violet: { icon: 'rgba(124,92,255,.14)', value: '#6d28d9' },
}
const KPI_ICON_COLOR: Record<FopTone, string> = {
  '': '#0d9488',
  red: '#b91c1c',
  yellow: '#92400e',
  green: '#047857',
  blue: '#1d4ed8',
  violet: '#6d28d9',
}

export const FopCard = ({ children, style }: { children: ReactNode; style?: React.CSSProperties }) => (
  <div
    className="rounded-[14px] border p-3.5 mb-3"
    style={{ background: '#fff', borderColor: 'var(--qms-border)', boxShadow: '0 4px 12px rgba(15,23,42,.04)', ...style }}
  >
    {children}
  </div>
)

export const FopCardHeader = ({ children, right }: { children: ReactNode; right?: ReactNode }) => (
  <div className="flex items-center justify-between gap-2 mb-2.5 font-extrabold text-[13px]">
    <span className="flex items-center gap-1.5">{children}</span>
    {right}
  </div>
)

export const FopPageHeading = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="mb-3.5">
    <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>FO Workspace</div>
    <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--qms-text)' }}>{title}</h1>
    <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{subtitle}</div>
  </div>
)

export const FopKpiGrid = ({ children }: { children: ReactNode }) => (
  <div className="grid gap-2.5 mb-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
    {children}
  </div>
)

interface FopKpiProps {
  label: string
  value: string | number
  sub: string
  icon: IconType
  tone?: FopTone
}

export const FopKpi = ({ label, value, sub, icon: Icon, tone = '' }: FopKpiProps) => (
  <div className="relative rounded-xl border p-3" style={{ background: '#fff', borderColor: 'var(--qms-border)', boxShadow: '0 4px 12px rgba(15,23,42,.04)' }}>
    <div className="absolute top-2.5 right-2.5 w-[30px] h-[30px] rounded-lg flex items-center justify-center" style={{ background: KPI_TONE_STYLE[tone].icon, color: KPI_ICON_COLOR[tone] }}>
      <Icon size={14} />
    </div>
    <div className="text-[10.5px] uppercase font-bold tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{label}</div>
    <div className="text-[22px] font-extrabold mt-1" style={{ color: KPI_TONE_STYLE[tone].value ?? 'var(--qms-text)' }}>{value}</div>
    <div className="text-[10.5px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>{sub}</div>
  </div>
)

export type FopPillTone = 'green' | 'red' | 'amber' | 'blue' | 'violet' | 'grey'
const PILL_STYLE: Record<FopPillTone, { background: string; color: string }> = {
  green: { background: 'rgba(16,185,129,.16)', color: '#047857' },
  red: { background: 'rgba(244,63,94,.16)', color: '#b91c1c' },
  amber: { background: 'rgba(245,158,11,.18)', color: '#92400e' },
  blue: { background: 'rgba(59,109,255,.14)', color: '#1d4ed8' },
  violet: { background: 'rgba(124,92,255,.14)', color: '#6d28d9' },
  grey: { background: 'rgba(15,23,42,.06)', color: '#475569' },
}

export const FopPill = ({ tone, children }: { tone: FopPillTone; children: ReactNode }) => (
  <span className="text-[10px] font-extrabold px-2 py-[3px] rounded-full tracking-wide inline-block" style={PILL_STYLE[tone]}>
    {children}
  </span>
)

export const FopEmpty = ({ icon: Icon, label }: { icon: IconType; label: string }) => (
  <div className="text-center py-7 px-3.5" style={{ color: 'var(--qms-text-muted)' }}>
    <Icon size={26} className="mx-auto mb-1.5 opacity-50" />
    <div className="text-[12.5px]">{label}</div>
  </div>
)

export type FopAlertTone = 'red' | 'yellow' | 'blue'
const ALERT_STYLE: Record<FopAlertTone, { background: string; color: string; borderColor: string }> = {
  red: { background: 'rgba(244,63,94,.1)', color: '#b91c1c', borderColor: 'rgba(244,63,94,.25)' },
  yellow: { background: 'rgba(245,158,11,.1)', color: '#92400e', borderColor: 'rgba(245,158,11,.3)' },
  blue: { background: 'rgba(59,109,255,.08)', color: '#1d4ed8', borderColor: 'rgba(59,109,255,.25)' },
}

export const FopAlert = ({ tone, icon: Icon, children }: { tone: FopAlertTone; icon: IconType; children: ReactNode }) => (
  <div className="rounded-[11px] px-3 py-2.5 text-[12.5px] font-bold flex items-center gap-2 mb-2.5 border" style={ALERT_STYLE[tone]}>
    <Icon size={14} className="shrink-0" />
    {children}
  </div>
)

export const FopCta = ({
  tone = 'ghost',
  sm,
  children,
  onClick,
  type = 'button',
}: {
  tone?: 'primary' | 'danger' | 'ghost'
  sm?: boolean
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
}) => {
  const toneStyle =
    tone === 'primary'
      ? { background: 'linear-gradient(135deg,#14b8a6,#0ea5e9)', color: '#fff', boxShadow: '0 6px 18px rgba(20,184,166,.32)', border: 'none' }
      : tone === 'danger'
        ? { background: 'linear-gradient(135deg,#f43f5e,#fb7185)', color: '#fff', border: 'none' }
        : { background: 'var(--qms-surface)', color: 'var(--qms-text)', border: '1px solid var(--qms-border)' }
  return (
    <button
      type={type}
      onClick={onClick}
      className={`rounded-[11px] font-extrabold inline-flex items-center justify-center gap-2 ${sm ? 'min-h-[34px] text-[11.5px] px-3 py-1.5' : 'min-h-[44px] text-[13px] px-3.5 py-2.5'}`}
      style={toneStyle}
    >
      {children}
    </button>
  )
}

export const FopTable = ({ children }: { children: ReactNode }) => (
  <table className="w-full border-collapse text-[12px]">{children}</table>
)
