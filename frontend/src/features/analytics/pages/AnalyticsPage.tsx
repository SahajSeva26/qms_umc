import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { AnalyticsTab } from '@/types/analytics.types'
import { ANALYTICS_ROUTES } from '@/features/analytics/analytics.paths'
import { useAnalyticsFilters } from '@/features/analytics/hooks/useAnalyticsFilters'
import { useAnalyticsData } from '@/features/analytics/hooks/useAnalyticsData'
import { computeAnalyticsKpis } from '@/features/analytics/analytics.kpis'
import { formatINR } from '@/utils/formatters'
import AnalyticsHeader from '@/features/analytics/components/AnalyticsHeader'
import InsightBanner from '@/features/analytics/components/InsightBanner'
import AnalyticsKpiStrip from '@/features/analytics/components/AnalyticsKpiStrip'
import ExecutiveTab from '@/features/analytics/components/tabs/ExecutiveTab'
import CampsTab from '@/features/analytics/components/tabs/CampsTab'
import DoctorsTab from '@/features/analytics/components/tabs/DoctorsTab'

// Literal paths (circular dependency with analytics.routes.tsx). fo/sales/financial are absent —
// those routes render their own dedicated pages, never this component.
const ROUTE_TO_TAB: Record<string, AnalyticsTab> = {
  '/analytics/doctors': 'doctors',
}

const TABS: { id: AnalyticsTab; label: string }[] = [
  { id: 'exec', label: 'Executive' },
  { id: 'sales', label: 'Sales & Pipeline' },
  { id: 'camps', label: 'Camps' },
  { id: 'doctors', label: 'Doctors' },
  { id: 'fo', label: 'FO Performance' },
  { id: 'financial', label: 'Financial' },
]

const TAB_TITLES: Record<AnalyticsTab, string> = {
  exec: 'Analytics',
  sales: 'Sales Analytics',
  camps: 'Camps Analytics',
  doctors: 'Doctor Analytics',
  fo: 'FO Analytics',
  financial: 'Financial Analytics',
}

// Shared by /analytics (all 6 tabs, switcher shown) and the 3 remaining focused routes (pinned to
// one tab, no switcher) — replaces the prototype's <iframe src="analytics.html"> embed.
const AnalyticsPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const focusedTab = ROUTE_TO_TAB[location.pathname]
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('exec')

  const { filters, setFilter } = useAnalyticsFilters()
  const data = useAnalyticsData(filters)

  const kpis = useMemo(
    () => computeAnalyticsKpis(data.camps, data.projects, data.leads, data.invoices, data.activeFOs, formatINR),
    [data]
  )

  const tab = focusedTab ?? activeTab

  return (
    <div className="w-full">
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--qms-text-muted)' }}>
          Insights · {TAB_TITLES[tab]}
        </p>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>{TAB_TITLES[tab]}</h1>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-success-soft text-success">Cross-module · live</span>
          <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
            Sales · Camps · Finance
          </span>
          <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
            Drill by client / period
          </span>
        </div>
      </div>

      <AnalyticsHeader filters={filters} setFilter={setFilter} clients={data.clients} />

      {data.isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading analytics…
        </div>
      )}

      {data.error && !data.isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load analytics. Please try again.
        </div>
      )}

      {!data.isLoading && !data.error && (
        <>
          <InsightBanner camps={data.camps} leads={data.leads} invoices={data.invoices} />
          <AnalyticsKpiStrip tiles={kpis} />

          {!focusedTab && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  // FO/Sales/Financial navigate out instead of rendering inside this legacy mock shell.
                  onClick={() => {
                    if (t.id === 'fo') return navigate(ANALYTICS_ROUTES.ANALYTICS_FO)
                    if (t.id === 'sales') return navigate(ANALYTICS_ROUTES.ANALYTICS_SALES)
                    if (t.id === 'financial') return navigate(ANALYTICS_ROUTES.ANALYTICS_FINANCIAL)
                    setActiveTab(t.id)
                  }}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-all"
                  style={
                    tab === t.id
                      ? { background: 'var(--qms-brand)', borderColor: 'var(--qms-brand)', color: '#fff' }
                      : { background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {tab === 'exec' && <ExecutiveTab camps={data.camps} clients={data.clients} pnlTrend={data.pnlTrend} />}
          {tab === 'camps' && <CampsTab camps={data.camps} />}
          {tab === 'doctors' && <DoctorsTab camps={data.camps} doctors={data.doctors} />}
        </>
      )}
    </div>
  )
}

export default AnalyticsPage
