import type { ReactNode } from 'react'
import type { IconType } from 'react-icons'

// Matches the prototype's .pick-grid / .pick-card / .pick-card.on / .pick-card .ic
// CSS exactly (projects-manager.js / crm-sales-leads.js injectCss()):
//   .pick-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:8px; }
//   .pick-card { display:flex; align-items:flex-start; gap:8px; padding:10px; border-radius:12px;
//                border:1px solid var(--border); background:var(--surface); cursor:pointer; }
//   .pick-card:hover { border-color:rgba(59,109,255,.4); }
//   .pick-card.on { border-color:var(--pc,var(--brand-500)); background:color-mix(in srgb,var(--pc,var(--brand-500)) 8%,transparent);
//                   box-shadow:0 0 0 3px color-mix(in srgb,var(--pc,var(--brand-500)) 16%,transparent); }
//   .pick-card .ic { width:28px; height:28px; border-radius:8px; color:#fff; background:var(--pc,var(--brand-500)); }
//   .pick-card .lab { font-size:12px; font-weight:700; color:var(--text); }
//   .pick-card .ds { font-size:10px; color:var(--text-soft); margin-top:2px; }
export const PickGrid = ({ children }: { children: ReactNode }) => (
  <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
    {children}
  </div>
)

interface PickCardProps {
  active: boolean
  /** Drives the .on border/tint/glow (--pc). Omit for cards with no per-item color (e.g. Booking roles, which always glow brand-500). */
  color?: string
  label: string
  desc?: string
  icon?: IconType
  /** Colored icon-tile background (defaults to `color`). Booking-role cards use a fixed light tint here while still glowing brand-500 on select. */
  tileColor?: string
  tileTextColor?: string
  /** Icon tile shows text (initials, or nothing) instead of an icon — a plain solid-color square if both icon and initials are omitted (e.g. Project status). */
  initials?: string
  /** Project status cards render the .ic tile with no icon/text at all — just a solid color square. */
  showTile?: boolean
  onClick: () => void
}

const ACTIVE_DEFAULT = 'var(--qms-brand)'

export const PickCard = ({ active, color, label, desc, icon: Icon, tileColor, tileTextColor, initials, showTile = true, onClick }: PickCardProps) => {
  const activeColor = color ?? ACTIVE_DEFAULT
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-2 p-2.5 rounded-xl border text-left transition-colors"
      style={
        active
          ? { borderColor: activeColor, background: `color-mix(in srgb, ${activeColor} 8%, transparent)`, boxShadow: `0 0 0 3px color-mix(in srgb, ${activeColor} 16%, transparent)` }
          : { borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }
      }
    >
      {showTile && (
        <span
          className="inline-flex items-center justify-center w-7 h-7 rounded-lg shrink-0"
          style={{ background: tileColor ?? color ?? ACTIVE_DEFAULT, color: tileTextColor ?? '#fff' }}
        >
          {Icon ? <Icon size={14} /> : initials ? <span className="text-[11px] font-extrabold">{initials}</span> : null}
        </span>
      )}
      <span>
        <span className="block text-[12px] font-bold" style={{ color: 'var(--qms-text)' }}>{label}</span>
        {desc && <span className="block text-[10px] mt-0.5 leading-snug" style={{ color: 'var(--qms-text-soft)' }}>{desc}</span>}
      </span>
    </button>
  )
}
