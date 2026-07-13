import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { AnalyticsTab } from '@/types/analytics.types'
import { useAnalyticsFilters } from '@/features/analytics/hooks/useAnalyticsFilters'
import { useAnalyticsData } from '@/features/analytics/hooks/useAnalyticsData'
import { computeAnalyticsKpis } from '@/features/analytics/analytics.kpis'
import { formatINR } from '@/utils/formatters'
import AnalyticsHeader from '@/features/analytics/components/AnalyticsHeader'
import InsightBanner from '@/features/analytics/components/InsightBanner'
import AnalyticsKpiStrip from '@/features/analytics/components/AnalyticsKpiStrip'
import ExecutiveTab from '@/features/analytics/components/tabs/ExecutiveTab'
import SalesPipelineTab from '@/features/analytics/components/tabs/SalesPipelineTab'
import CampsTab from '@/features/analytics/components/tabs/CampsTab'
import DoctorsTab from '@/features/analytics/components/tabs/DoctorsTab'
import FoPerformanceTab from '@/features/analytics/components/tabs/FoPerformanceTab'
import FinancialTab from '@/features/analytics/components/tabs/FinancialTab'

// Literal paths (not imported from analytics.routes.tsx) — that file imports
// this component to build its route table, so importing back from it here
// would be a circular module dependency.
const ROUTE_TO_TAB: Record<string, AnalyticsTab> = {
  '/analytics/sales': 'sales',
  '/analytics/fo': 'fo',
  '/analytics/doctors': 'doctors',
  '/analytics/financial': 'financial',
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

// AnalyticsModule — one shared component rendered by all 5 analytics routes.
// The 4 focused routes (/analytics/sales|fo|doctors|financial) pin the view
// to a single tab (no tab switcher shown); /analytics shows all 6, starting
// on Executive. This replaces the prototype's <iframe src="analytics.html">
// embed with a real component — deliberately not porting the iframe hack.
const AnalyticsPage = () => {
  const location = useLocation()
  const focusedTab = ROUTE_TO_TAB[location.pathname]
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('exec')

  const { filters, setFilter } = useAnalyticsFilters()
  const data = useAnalyticsData(filters)

  const kpis = useMemo(
    () => computeAnalyticsKpis(data.camps, data.projects, data.leads, data.invoices, data.fieldOfficers, formatINR),
    [data]
  )

  const tab = focusedTab ?? activeTab

  return (
    <div className="max-w-7xl">
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
                  onClick={() => setActiveTab(t.id)}
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
          {tab === 'sales' && <SalesPipelineTab leads={data.leads} />}
          {tab === 'camps' && <CampsTab camps={data.camps} />}
          {tab === 'doctors' && <DoctorsTab camps={data.camps} doctors={data.doctors} />}
          {tab === 'fo' && <FoPerformanceTab camps={data.camps} fieldOfficers={data.fieldOfficers} />}
          {tab === 'financial' && (
            <FinancialTab invoices={data.invoices} pnlTrend={data.pnlTrend} expenseSplit={data.expenseSplit} arAging={data.arAging} />
          )}
        </>
      )}
    </div>
  )
}

export default AnalyticsPage
