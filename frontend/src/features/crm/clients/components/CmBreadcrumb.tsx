import { FiChevronRight } from 'react-icons/fi'

export interface Crumb {
  label: string
  /** Omit on the current (last) crumb — rendered as plain text */
  onClick?: () => void
}

interface CmBreadcrumbProps {
  crumbs: Crumb[]
}

// 'All Clients › {client} › {division}' — every crumb except the current one
// navigates back up the drill-down.
const CmBreadcrumb = ({ crumbs }: CmBreadcrumbProps) => (
  <nav className="flex flex-wrap items-center gap-1 text-[12px] font-semibold mb-3">
    {crumbs.map((crumb, i) => {
      const isLast = i === crumbs.length - 1
      return (
        <span key={`${crumb.label}-${i}`} className="flex items-center gap-1">
          {i > 0 && <FiChevronRight size={12} style={{ color: 'var(--qms-text-muted)' }} />}
          {isLast || !crumb.onClick ? (
            <span style={{ color: 'var(--qms-text-muted)' }}>{crumb.label}</span>
          ) : (
            <button onClick={crumb.onClick} className="hover:underline" style={{ color: 'var(--qms-brand)' }}>
              {crumb.label}
            </button>
          )}
        </span>
      )
    })}
  </nav>
)

export default CmBreadcrumb
