import type { ReactNode } from 'react'

// Matches the CRM prototype's .ptype-row / .ptype-row .seg exactly
// (crm-sales-leads.js injectCss()):
//   .ptype-row { display:flex; gap:6px; flex-wrap:wrap; }
//   .ptype-row .seg { padding:8px 14px; border-radius:10px; border:1px solid var(--border);
//                      background:var(--surface); font-size:12px; font-weight:700; color:var(--text-soft); }
//   .ptype-row .seg.on { border-color:var(--brand-500); background:rgba(59,109,255,.08); color:var(--brand-700); }
//
// Plain text pill-segment buttons — no icon, no color-tile, unlike Projects'
// PickCard. Used for the CRM wizard's "Type of project" selector.
export const SegRow = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-wrap gap-1.5">{children}</div>
)

interface SegButtonProps {
  active: boolean
  onClick: () => void
  children: ReactNode
}

export const SegButton = ({ active, onClick, children }: SegButtonProps) => (
  <button
    onClick={onClick}
    className="px-3.5 py-2 rounded-[10px] border text-[12px] font-bold transition-colors"
    style={
      active
        ? { borderColor: 'var(--qms-brand)', background: 'color-mix(in srgb, var(--qms-brand) 8%, transparent)', color: 'var(--qms-brand)' }
        : { borderColor: 'var(--qms-border)', background: 'var(--qms-surface)', color: 'var(--qms-text-soft)' }
    }
  >
    {children}
  </button>
)
