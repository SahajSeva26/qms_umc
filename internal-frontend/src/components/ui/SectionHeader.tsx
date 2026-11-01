import type { IconType } from 'react-icons'

// Matches the prototype's .section-h / .ic-tile (styles.css) exactly.
interface SectionHeaderProps {
  icon: IconType
  children: string
  /** Prototype adds margin-top:14px on every section-h except the first in a step */
  spaced?: boolean
  /** Numbered-section prefix (e.g. camp-booking.js's "1 · PROJECT & CAMP") — omit for an unnumbered header. */
  number?: number
}

const SectionHeader = ({ icon: Icon, children, spaced = true, number }: SectionHeaderProps) => (
  <div className={`flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide ${spaced ? 'mt-3.5' : ''} mb-1.5`} style={{ color: 'var(--qms-text-soft)' }}>
    <span
      className="inline-flex items-center justify-center w-5.5 h-5.5 rounded-[7px] shrink-0"
      style={{ background: 'color-mix(in srgb, var(--qms-brand) 10%, transparent)', color: 'var(--qms-brand)' }}
    >
      <Icon size={12} />
    </span>
    {number != null ? `${number} · ${children}` : children}
  </div>
)

export default SectionHeader
