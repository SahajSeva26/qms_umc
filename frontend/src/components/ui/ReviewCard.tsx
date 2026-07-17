import type { ReactNode } from 'react'

// Matches the prototype's .review-card / .pv-grid (Projects) and
// .preview-card / .pv-grid (CRM) — same shape, different class name:
//   padding:12-14px; border-radius:12-14px; border:1px solid var(--border);
//   .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(120-140px,1fr)); gap:8px 14px; }
//   .k { font-size:10px; font-weight:700; text-transform:uppercase; color:var(--text-soft); }
//   .v { font-size:12px; font-weight:600; color:var(--text); margin-top:2px; }
export const ReviewCard = ({ children }: { children: ReactNode }) => (
  <div className="p-3.5 rounded-xl border" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
    {children}
  </div>
)

export const ReviewGrid = ({ children }: { children: ReactNode }) => (
  <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
    {children}
  </div>
)

export const ReviewField = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-soft)' }}>{label}</div>
    <div className="text-[12px] font-semibold mt-0.5 wrap-break-word" style={{ color: 'var(--qms-text)' }}>{value}</div>
  </div>
)
