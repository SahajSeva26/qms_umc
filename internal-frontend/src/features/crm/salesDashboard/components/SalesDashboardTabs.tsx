export type SalesDashboardTab = 'today' | 'performance' | 'activity'

interface TabDef {
  id: SalesDashboardTab
  label: string
}

const TABS: TabDef[] = [
  { id: 'today', label: 'Today' },
  { id: 'performance', label: 'Performance' },
  { id: 'activity', label: 'Activity' },
]

interface SalesDashboardTabsProps {
  active: SalesDashboardTab
  onChange: (tab: SalesDashboardTab) => void
}

// Matches the prototype's .page-tabs/.page-tab (styles.css:1154-1178) — an underline style (2px
// bottom border, brand-blue when active), not a background pill. Team/Targets/Approvals/Journey are
// deliberately not ported — no real backend concept exists for any of them yet (see crm.myKpis.ts).
const SalesDashboardTabs = ({ active, onChange }: SalesDashboardTabsProps) => (
  <div className="flex gap-0.5 overflow-x-auto mb-[18px]" style={{ borderBottom: '1px solid var(--qms-border)' }}>
    {TABS.map((tab) => (
      <button
        key={tab.id}
        type="button"
        onClick={() => onChange(tab.id)}
        className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 px-4 py-2.5 text-[13px] font-semibold"
        style={{
          color: active === tab.id ? 'var(--qms-text)' : 'var(--qms-text-muted)',
          borderBottom: `2px solid ${active === tab.id ? 'var(--qms-brand)' : 'transparent'}`,
        }}
      >
        {tab.label}
      </button>
    ))}
  </div>
)

export default SalesDashboardTabs
