import type { IconType } from 'react-icons'

// Matches the prototype's .section-h / .ic-tile exactly:
//   .section-h { display:flex; gap:6px; font-size:11px; font-weight:800; text-transform:uppercase;
//                letter-spacing:.06em; color:var(--text-soft); margin:12px 0 6px; }
//   .ic-tile { width:22px; height:22px; border-radius:7px; background:rgba(59,109,255,.10); color:var(--brand-600); }
interface SectionHeaderProps {
  icon: IconType
  children: string
  /** Prototype adds margin-top:14px on every section-h except the first in a step */
  spaced?: boolean
}

const SectionHeader = ({ icon: Icon, children, spaced = true }: SectionHeaderProps) => (
  <div className={`flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide ${spaced ? 'mt-3.5' : ''} mb-1.5`} style={{ color: 'var(--qms-text-soft)' }}>
    <span
      className="inline-flex items-center justify-center w-5.5 h-5.5 rounded-[7px] shrink-0"
      style={{ background: 'color-mix(in srgb, var(--qms-brand) 10%, transparent)', color: 'var(--qms-brand)' }}
    >
      <Icon size={12} />
    </span>
    {children}
  </div>
)

export default SectionHeader
