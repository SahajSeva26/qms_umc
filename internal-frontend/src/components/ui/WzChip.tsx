import type { CSSProperties, ReactNode } from 'react'

// Matches the CRM prototype's .wz-chip-row / .wz-chip / .wz-chip.on exactly
// (crm-sales-leads.js injectCss()):
//   .wz-chip-row { display:flex; gap:6px; flex-wrap:wrap; margin-top:4px; }
//   .wz-chip { padding:5px 12px; border-radius:999px; border:1px solid var(--border);
//              background:var(--surface); font-size:12px; font-weight:600; color:var(--text-soft); }
//   .wz-chip:hover { border-color:rgba(59,109,255,.4); }
//   .wz-chip.on { border-color:var(--brand-500); background:var(--brand-500); color:#fff;
//                 box-shadow:0 1px 4px rgba(59,109,255,.25); }
//
// Two usages in the source: a plain always-on-or-off toggle (Currently doing,
// QMS offerings — no remove glyph), and a "chosen" chip that's always
// active with a ✕ glyph rendered *inside the same clickable span* to remove
// it (Focus therapy / Doctor specialty / Brands, added via a separate Select).
export const WzChipRow = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-wrap gap-1.5 mt-1">{children}</div>
)

const chipStyle = (active: boolean): CSSProperties =>
  active
    ? { borderColor: 'var(--qms-brand)', background: 'var(--qms-brand)', color: '#fff', boxShadow: '0 1px 4px rgba(59,109,255,.25)' }
    : { borderColor: 'var(--qms-border)', background: 'var(--qms-surface)', color: 'var(--qms-text-soft)' }

interface WzChipToggleProps {
  active: boolean
  onClick: () => void
  children: ReactNode
}

/** Plain toggle chip — no remove glyph (Currently doing / QMS offerings). */
export const WzChipToggle = ({ active, onClick, children }: WzChipToggleProps) => (
  <button onClick={onClick} className="px-3 py-1 rounded-full border text-[12px] font-semibold transition-colors" style={chipStyle(active)}>
    {children}
  </button>
)

interface WzChipRemovableProps {
  onRemove: () => void
  children: ReactNode
}

/** Always-active "chosen" chip with an inline ✕ (Focus therapy / Doctor specialty / Brands). */
export const WzChipRemovable = ({ onRemove, children }: WzChipRemovableProps) => (
  <span
    onClick={onRemove}
    className="px-3 py-1 rounded-full border text-[12px] font-semibold cursor-pointer"
    style={chipStyle(true)}
    title="Remove"
  >
    {children} <span className="opacity-70">✕</span>
  </span>
)
