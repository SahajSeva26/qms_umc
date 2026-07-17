import type { ReactNode } from 'react'

// Matches the prototype's .chip-row / .chip-toggle / .chip-toggle.on exactly
// (projects-manager.js / crm-sales-leads.js injectCss()):
//   .chip-row { display:flex; flex-wrap:wrap; gap:6px; }
//   .chip-toggle { padding:5px 10px; border-radius:999px; border:1px solid var(--border);
//                  background:var(--surface); color:var(--text-soft); font-size:11px; font-weight:700; }
//   .chip-toggle.on { background:var(--brand-500); color:#fff; border-color:var(--brand-500); }
//
// Unlike ChipPicker (a Select-to-add combobox), every chip here is always
// visible and independently toggleable by clicking it — no dropdown step.
// This is the pattern the prototype actually uses for Tests, Camp time
// slots, States/Cities, and the report-pointers "available pool".
export const ChipRow = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-wrap gap-1.5">{children}</div>
)

interface ChipToggleProps {
  active: boolean
  onClick: () => void
  children: ReactNode
}

export const ChipToggle = ({ active, onClick, children }: ChipToggleProps) => (
  <button
    onClick={onClick}
    className="px-2.5 py-1 rounded-full border text-[11px] font-bold transition-colors"
    style={
      active
        ? { background: 'var(--qms-brand)', color: '#fff', borderColor: 'var(--qms-brand)' }
        : { background: 'var(--qms-surface)', color: 'var(--qms-text-soft)', borderColor: 'var(--qms-border)' }
    }
  >
    {children}
  </button>
)
