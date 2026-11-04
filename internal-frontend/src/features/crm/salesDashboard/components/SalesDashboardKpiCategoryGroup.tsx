import type { ReactNode } from 'react'

interface SalesDashboardKpiCategoryGroupProps {
  title: string
  children: ReactNode
}

// Matches the Sales Dashboard's #salesKpis .kpi-cat / .kpi-cat-grid override (sales.js:448-463):
// an uppercase label with a 3px brand-blue left bar, then a tile row that packs as many columns
// as fit at minmax(168px,1fr) — not the base .kpi-grid's fixed repeat(4,1fr) breakpoints. Kept
// local to this feature (not components/ui) since this dashboard is its only consumer.
const SalesDashboardKpiCategoryGroup = ({ title, children }: SalesDashboardKpiCategoryGroupProps) => (
  <div className="first:mt-0.5">
    <div
      className="flex items-center gap-[7px] mt-[15px] mb-[7px] text-[11px] font-extrabold uppercase tracking-[0.06em]"
      style={{ color: 'var(--qms-text-muted)' }}
    >
      <span className="w-[3px] h-[13px] rounded-sm shrink-0" style={{ background: 'var(--qms-brand)' }} />
      {title}
    </div>
    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))' }}>
      {children}
    </div>
  </div>
)

export default SalesDashboardKpiCategoryGroup
