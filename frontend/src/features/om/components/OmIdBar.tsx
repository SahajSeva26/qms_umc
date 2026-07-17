interface OmIdBarProps {
  mode: 'Screening' | 'Diet'
  onModeChange: (mode: 'Screening' | 'Diet') => void
  canToggle: boolean
  userName: string
}

// Mirrors om-portal.html's .om-id-bar — role/name badge + Screening/Diet
// toggle for admins (om_screening/om_diet see a locked pill instead).
const OmIdBar = ({ mode, onModeChange, canToggle, userName }: OmIdBarProps) => (
  <div
    className="flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 mb-3"
    style={{ background: 'color-mix(in srgb, var(--qms-brand) 8%, transparent)', border: '1px solid var(--qms-border)' }}
  >
    <div className="flex items-center gap-2">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
        style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
      >
        {userName.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()}
      </div>
      <span className="text-[12px] font-semibold" style={{ color: 'var(--qms-text)' }}>{userName}</span>
    </div>

    {canToggle ? (
      <div className="flex rounded-full p-0.5" style={{ background: 'var(--qms-surface-strong)' }}>
        {(['Screening', 'Diet'] as const).map((m) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className="text-[11px] font-bold px-3 py-1 rounded-full transition-all"
            style={
              mode === m
                ? { background: 'linear-gradient(135deg, #3b6dff, #14b8a6)', color: '#fff' }
                : { color: 'var(--qms-text-muted)' }
            }
          >
            {m}
          </button>
        ))}
      </div>
    ) : (
      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
        {mode}
      </span>
    )}
  </div>
)

export default OmIdBar
