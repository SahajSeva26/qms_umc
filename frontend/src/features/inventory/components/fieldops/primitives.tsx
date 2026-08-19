import type { RefillStatus, IssueType } from '@/features/inventory/inventory.types'
import { EXPIRY_BAND_STYLE } from '@/features/inventory/constants/expiryBandStyle'

export function SegButton({
  active, onClick, icon, children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg text-xs font-bold border-0"
      style={{
        padding: '6px 14px',
        background: active ? 'var(--qms-card)' : 'transparent',
        color: active ? 'var(--qms-text)' : 'var(--qms-text-muted)',
        boxShadow: active ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
      }}
    >
      {icon} {children}
    </button>
  )
}

// ── Status pills — .fld-st + variant, exact port of injectCss()'s color map. ──
const REFILL_STATUS_STYLE: Record<RefillStatus, { bg: string; fg: string }> = {
  REQUESTED: { bg: 'rgba(245,158,11,.16)', fg: '#b45309' },
  APPROVED: { bg: 'rgba(59,109,255,.14)', fg: 'var(--qms-brand-700, #2451f0)' },
  DISPATCHED: { bg: 'rgba(16,185,129,.15)', fg: '#059669' },
  REJECTED: { bg: 'rgba(244,63,94,.15)', fg: '#e11d48' },
}

export function RefillStatusPill({ status }: { status: RefillStatus }) {
  const s = REFILL_STATUS_STYLE[status]
  return (
    <span
      className="inline-flex items-center font-bold uppercase tracking-[.03em] rounded-full"
      style={{ padding: '2px 8px', fontSize: 10, background: s.bg, color: s.fg }}
    >
      {status}
    </span>
  )
}

const ISSUE_TYPE_STYLE: Record<IssueType, { bg: string; fg: string }> = {
  WASTAGE: { bg: 'rgba(244,63,94,.12)', fg: '#e11d48' },
  DAMAGE: { bg: 'rgba(244,63,94,.12)', fg: '#e11d48' },
  LOSS: { bg: 'rgba(244,63,94,.12)', fg: '#e11d48' },
  EXPIRY: { bg: 'rgba(244,63,94,.12)', fg: '#e11d48' },
  CONSUMPTION: { bg: 'rgba(59,109,255,.12)', fg: 'var(--qms-brand-700, #2451f0)' },
  RETURN: { bg: 'rgba(16,185,129,.13)', fg: '#059669' },
  LOCAL_PROCURE: { bg: 'rgba(16,185,129,.13)', fg: '#059669' },
}

export function IssueTypePill({ type }: { type: IssueType }) {
  const s = ISSUE_TYPE_STYLE[type]
  return (
    <span
      className="inline-flex items-center font-bold uppercase tracking-[.03em] rounded-full"
      style={{ padding: '2px 8px', fontSize: 10, background: s.bg, color: s.fg }}
    >
      {type.replace('_', ' ')}
    </span>
  )
}

export function BandPill({ css, children }: { css: 'green' | 'yellow' | 'orange' | 'red'; children: React.ReactNode }) {
  const s = EXPIRY_BAND_STYLE[css]
  return (
    <span
      className="inline-flex items-center gap-1 font-bold uppercase rounded-full"
      style={{ padding: '2px 8px', fontSize: 10, letterSpacing: '.03em', background: s.bg, color: s.fg }}
    >
      {children}
    </span>
  )
}

export function TableCard({ minWidth, children }: { minWidth: number; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border overflow-auto" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
      <table className="border-collapse text-xs" style={{ width: '100%', minWidth }}>
        {children}
      </table>
    </div>
  )
}

export function Th({ children, num }: { children: React.ReactNode; num?: boolean }) {
  return (
    <th
      className={`text-left font-bold uppercase tracking-[.04em] ${num ? 'text-right' : ''}`}
      style={{ padding: '8px 6px', fontSize: 10, color: 'var(--qms-text-muted)', borderBottom: '1px dashed var(--qms-border)' }}
    >
      {children}
    </th>
  )
}

export function Td({ children, num, nowrap }: { children: React.ReactNode; num?: boolean; nowrap?: boolean }) {
  return (
    <td
      className={num ? 'text-right tabular-nums' : ''}
      style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)', whiteSpace: nowrap ? 'nowrap' : undefined }}
    >
      {children}
    </td>
  )
}
