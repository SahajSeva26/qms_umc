import type { ReactNode } from 'react'
import type { IconType } from 'react-icons'

interface AnalyticsSectionCardProps {
  icon: IconType
  iconGradient: string
  title: string
  subtitle: string
  headerAction?: ReactNode
  children: ReactNode
}

// Same card-chrome shape as the Dashboard module's SectionCard, kept local
// (not a cross-feature import) since features communicate only through
// shared types/hooks/lib/components-ui.
const AnalyticsSectionCard = ({ icon: Icon, iconGradient, title, subtitle, headerAction, children }: AnalyticsSectionCardProps) => (
  <div
    className="rounded-2xl border p-4 md:p-5 mb-3.5"
    style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
  >
    <div
      className="flex items-center justify-between gap-3 pb-3 mb-3.5"
      style={{ borderBottom: '1px dashed var(--qms-border)' }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="w-8 h-8 rounded-[9px] flex items-center justify-center text-white shrink-0"
          style={{ background: iconGradient }}
        >
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>{title}</h2>
          <p className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{subtitle}</p>
        </div>
      </div>
      {headerAction}
    </div>
    {children}
  </div>
)

export default AnalyticsSectionCard
