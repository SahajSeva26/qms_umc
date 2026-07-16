// Mirrors the prototype's .do-pill status chip (5 tone variants).
export type DoPillTone = 'ok' | 'warn' | 'bad' | 'info' | 'dedi'

const TONE_STYLE: Record<DoPillTone, { bg: string; color: string }> = {
  ok: { bg: 'var(--success-soft)', color: 'var(--success)' },
  warn: { bg: 'var(--warning-soft)', color: 'var(--warning)' },
  bad: { bg: 'var(--danger-soft)', color: 'var(--danger)' },
  info: { bg: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' },
  dedi: { bg: 'rgba(139,92,246,.12)', color: '#8b5cf6' },
}

const DoPill = ({ tone, children }: { tone: DoPillTone; children: React.ReactNode }) => {
  const style = TONE_STYLE[tone]
  return (
    <span
      className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
      style={{ background: style.bg, color: style.color }}
    >
      {children}
    </span>
  )
}

export default DoPill
