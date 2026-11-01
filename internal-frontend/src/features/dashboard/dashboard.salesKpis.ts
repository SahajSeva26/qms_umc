import type { KpiTone, SalesKpiTile } from '@/components/widgets/sales-kpi/sales.kpis'
import { formatINR, formatPercent } from '@/utils/formatters'

// The Dashboard's own 20-tile KPI grid (super_admin only) — Dashboard-specific, not a reusable
// widget. Most tiles render "-" (no sales-target/quota backend model exists). "Camps & Projects"
// and "Pipeline Value"/"Lead win rate" are real, reusing values already fetched elsewhere on this page.
export interface DashboardCampsProjectsCounts {
  campsConducted: number | null
  totalScreenings: number | null
  totalProjects: number | null
  screeningProjects: number | null
  dietProjects: number | null
  labProjects: number | null
}

export interface DashboardSalesKpiValues {
  pipelineValue: number | null
  leadWinRate: number | null
}

export function buildDashboardSalesKpis(
  campsProjects?: DashboardCampsProjectsCounts,
  salesKpis?: DashboardSalesKpiValues,
): SalesKpiTile[] {
  const placeholder = (cat: string, id: string, label: string, tone: KpiTone): SalesKpiTile => ({
    cat, id, label, tone, value: '-', sub: '',
  })
  const real = (cat: string, id: string, label: string, tone: KpiTone, value: number | null | undefined, unit?: 'pct' | 'inr'): SalesKpiTile => {
    let formatted = '-'
    if (value != null) {
      if (unit === 'pct') formatted = formatPercent(value, 0)
      else if (unit === 'inr') formatted = formatINR(value)
      else formatted = String(value)
    }
    return { cat, id, label, tone, value: formatted, sub: '' }
  }

  return [
    placeholder('Revenue & Profitability', 'sh-rev', 'Total Revenue', 'emerald'),
    placeholder('Revenue & Profitability', 'sh-rvt', 'Revenue vs Target %', 'brand'),
    placeholder('Revenue & Profitability', 'sh-ytd', 'YTD Growth %', 'teal'),
    placeholder('Revenue & Profitability', 'sh-run', 'Monthly Run Rate', 'violet'),
    placeholder('Revenue & Profitability', 'sh-gm', 'Gross Margin %', 'amber'),
    placeholder('Revenue & Profitability', 'sh-ebitda', 'EBITDA Contribution', 'emerald'),
    placeholder('Revenue & Profitability', 'sh-out', 'Outstanding Collections', 'rose'),

    real('Pipeline & Forecast', 'sh-pipe', 'Pipeline Value', 'brand', salesKpis?.pipelineValue, 'inr'),
    real('Pipeline & Forecast', 'sh-conv', 'Lead win rate', 'amber', salesKpis?.leadWinRate, 'pct'),
    placeholder('Pipeline & Forecast', 'sh-fc', 'Forecasted Revenue', 'violet'),

    placeholder('Accounts & Team', 'acc', 'Total Active Accounts', 'brand'),
    placeholder('Accounts & Team', 'sh-new', 'New Accounts Acquired', 'teal'),
    placeholder('Accounts & Team', 'sh-hv', 'High Value Accounts', 'amber'),
    placeholder('Accounts & Team', 'sh-ret', 'Client Retention %', 'emerald'),
    placeholder('Accounts & Team', 'sh-team', 'Sales Team Reporting', 'brand'),

    real('Camps & Projects', 'sh-camps', 'Total Camps Conducted', 'violet', campsProjects?.campsConducted),
    real('Camps & Projects', 'sh-scr', 'Total Screenings', 'teal', campsProjects?.totalScreenings),
    real('Camps & Projects', 'sh-prj', 'No. of Projects', 'brand', campsProjects?.totalProjects),
    real('Camps & Projects', 'sh-pscr', 'Screening Projects', 'teal', campsProjects?.screeningProjects),
    real('Camps & Projects', 'sh-pdiet', 'Diet Projects', 'emerald', campsProjects?.dietProjects),
    real('Camps & Projects', 'sh-plab', 'Lab Projects', 'amber', campsProjects?.labProjects),
  ]
}
