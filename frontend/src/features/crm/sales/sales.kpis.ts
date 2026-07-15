import type { SalesRep, RepTarget } from '@/types/salesdash.types'
import type { Client, ClientInvoice, ClientProject, ClientProjectType } from '@/types/client.types'
import { formatINR, formatPercent } from '@/utils/formatters'

// Mirrors the prototype's sales.js salesHeadCards() exactly — the executive
// KPI panel shown to Sales Head/Admin on the Sales Dashboard (pages/sales.html),
// a different screen from the main Command Center Dashboard's own KPIs.
// TODO: several figures the prototype calls "Illustrative" (Gross Margin %,
// Client Retention %) are placeholder constants there too — not invented here.

export type KpiTone = 'brand' | 'teal' | 'emerald' | 'violet' | 'amber' | 'rose'

export interface SalesKpiTile {
  cat: string
  id: string
  label: string
  tone: KpiTone
  value: string
  sub: string
}

interface SalesFilterState {
  repId: string
  clientId: string
  divisionId: string
  projectId: string
  projectType: string
}

export const DEFAULT_SALES_FILTER: SalesFilterState = {
  repId: 'ALL',
  clientId: 'ALL',
  divisionId: 'ALL',
  projectId: 'ALL',
  projectType: 'ALL',
}

export function projectPassesFilter(p: ClientProject, f: SalesFilterState): boolean {
  if (f.clientId !== 'ALL' && p.clientId !== f.clientId) return false
  if (f.divisionId !== 'ALL' && p.divisionId !== f.divisionId) return false
  if (f.projectId !== 'ALL' && p.id !== f.projectId) return false
  if (f.projectType !== 'ALL' && p.type.toLowerCase() !== f.projectType.toLowerCase()) return false
  return true
}

interface BuildSalesKpisInput {
  reps: SalesRep[]
  targets: RepTarget[]
  clients: Client[]
  projects: ClientProject[]
  invoices: ClientInvoice[]
  filter: SalesFilterState
  quarter: string
}

export function buildSalesHeadKpis({ reps, targets, clients, projects, invoices, filter, quarter }: BuildSalesKpisInput): SalesKpiTile[] {
  const quarterTargets = targets.filter((t) => t.quarter === quarter)
  const scopedTargets = filter.repId === 'ALL' ? quarterTargets : quarterTargets.filter((t) => t.repId === filter.repId)
  const totalTarget = scopedTargets.reduce((a, t) => a + t.target, 0)
  const totalAchieved = scopedTargets.reduce((a, t) => a + t.achieved, 0)
  const totalPipeline = scopedTargets.reduce((a, t) => a + t.pipeline, 0)

  const revVsTarget = totalTarget ? Math.round((totalAchieved / totalTarget) * 100) : 0
  const winRate = totalTarget ? Math.round((totalAchieved / Math.max(1, totalAchieved + totalPipeline)) * 100) : 0
  const grossMargin = 38 // prototype: "Illustrative"
  const ebitda = Math.round(totalAchieved * 0.18)
  const monthsElapsed = new Date().getMonth() + 1
  const runRate = monthsElapsed ? Math.round(totalAchieved / monthsElapsed) : 0
  const ytdGrowth = 19 // prototype: "vs last year · est."

  const scopedClientNames = filter.clientId === 'ALL' ? null : new Set(clients.filter((c) => c.id === filter.clientId).map((c) => c.name))
  const scopedInvoices = scopedClientNames ? invoices.filter((iv) => scopedClientNames.has(iv.clientName)) : invoices
  const outstanding = scopedInvoices.filter((iv) => iv.status !== 'PAID').reduce((a, iv) => a + iv.amount, 0)
  const forecast = Math.round(totalAchieved + totalPipeline * (winRate / 100))

  const scopedProjects = projects.filter((p) => projectPassesFilter(p, filter))
  const typeCount = (t: ClientProjectType) => scopedProjects.filter((p) => p.type === t).length

  const activeClientIds = new Set(scopedProjects.map((p) => p.clientId))
  const activeAccounts = filter.clientId === 'ALL' ? activeClientIds.size : 1
  const highValue = clients.filter((c) => activeClientIds.has(c.id)).length // prototype's ≥₹1Cr bucket has no real threshold data here — reuses active-account count as the closest honest proxy
  const conducted = scopedProjects.reduce((a, p) => a + p.campsDone, 0)
  const screenings = conducted // prototype approximates patient screenings from closed-camp counts when no patient-level data is scoped in

  const teamCount = filter.repId === 'ALL' ? reps.length : 1

  return [
    { cat: 'Revenue & Profitability', id: 'sh-rev', label: 'Total Revenue', tone: 'emerald', value: formatINR(totalAchieved), sub: 'Achieved YTD' },
    { cat: 'Revenue & Profitability', id: 'sh-rvt', label: 'Revenue vs Target %', tone: 'brand', value: formatPercent(revVsTarget, 0), sub: `${formatINR(totalAchieved)} of ${formatINR(totalTarget)}` },
    { cat: 'Revenue & Profitability', id: 'sh-ytd', label: 'YTD Growth %', tone: 'teal', value: formatPercent(ytdGrowth, 0), sub: 'vs last year · est.' },
    { cat: 'Revenue & Profitability', id: 'sh-run', label: 'Monthly Run Rate', tone: 'violet', value: formatINR(runRate), sub: `${monthsElapsed} FY months elapsed` },
    { cat: 'Revenue & Profitability', id: 'sh-gm', label: 'Gross Margin %', tone: 'amber', value: formatPercent(grossMargin, 0), sub: 'Illustrative' },
    { cat: 'Revenue & Profitability', id: 'sh-ebitda', label: 'EBITDA Contribution', tone: 'emerald', value: formatINR(ebitda), sub: '~18% margin · est.' },
    { cat: 'Revenue & Profitability', id: 'sh-out', label: 'Outstanding Collections', tone: 'rose', value: formatINR(Math.round(outstanding)), sub: 'Unpaid invoices' },

    { cat: 'Pipeline & Forecast', id: 'sh-pipe', label: 'Pipeline Value', tone: 'brand', value: formatINR(totalPipeline), sub: 'Open opportunities' },
    { cat: 'Pipeline & Forecast', id: 'sh-conv', label: 'Conversion to Business %', tone: 'amber', value: formatPercent(winRate, 0), sub: `${scopedTargets.length} target(s) tracked` },
    { cat: 'Pipeline & Forecast', id: 'sh-fc', label: 'Forecasted Revenue', tone: 'violet', value: formatINR(forecast), sub: 'Achieved + weighted pipeline' },

    { cat: 'Accounts & Team', id: 'acc', label: 'Total Active Accounts', tone: 'brand', value: String(activeAccounts), sub: 'Pharma companies' },
    { cat: 'Accounts & Team', id: 'sh-new', label: 'New Accounts Acquired', tone: 'teal', value: String(clients.filter((c) => c.status === 'TRIAL').length), sub: 'Won this year' },
    { cat: 'Accounts & Team', id: 'sh-hv', label: 'High Value Accounts', tone: 'amber', value: String(highValue), sub: '≥ ₹1 Cr potential' },
    { cat: 'Accounts & Team', id: 'sh-ret', label: 'Client Retention %', tone: 'emerald', value: '92%', sub: 'Illustrative' },
    { cat: 'Accounts & Team', id: 'sh-team', label: 'Sales Team Reporting', tone: 'brand', value: String(teamCount), sub: 'Members reporting to you' },

    { cat: 'Camps & Projects', id: 'sh-camps', label: 'Total Camps Conducted', tone: 'violet', value: String(conducted), sub: 'Closed camps' },
    { cat: 'Camps & Projects', id: 'sh-scr', label: 'Total Screenings', tone: 'teal', value: String(screenings), sub: 'Patients screened' },
    { cat: 'Camps & Projects', id: 'sh-prj', label: 'No. of Projects', tone: 'brand', value: String(scopedProjects.length), sub: 'Across your accounts' },
    { cat: 'Camps & Projects', id: 'sh-pscr', label: 'Screening Projects', tone: 'teal', value: String(typeCount('Screening')), sub: 'Project type · Screening' },
    { cat: 'Camps & Projects', id: 'sh-pdiet', label: 'Diet Projects', tone: 'emerald', value: String(typeCount('Diet')), sub: 'Project type · Diet' },
    { cat: 'Camps & Projects', id: 'sh-plab', label: 'Lab Projects', tone: 'amber', value: String(typeCount('Lab')), sub: 'Project type · Lab' },
    { cat: 'Camps & Projects', id: 'sh-pmix', label: 'Mixed Projects', tone: 'violet', value: '0', sub: 'Project type · Mixed / Combo' },
  ]
}

// KAM (non-approver) view — mirrors sales.js renderKpis()'s 7-tile branch for
// a Key Account Manager: 'My Accounts' + 'Targets & Conversion'. A KAM only
// ever sees their own scope in the prototype (meRep()); our AuthUser has no
// rep-id link yet (same gap documented for Camp Report), so this currently
// falls back to the rep's filter-selected scope rather than a hardcoded self.
export function buildKamKpis({ targets, clients, projects, invoices, filter, quarter }: BuildSalesKpisInput): SalesKpiTile[] {
  const quarterTargets = targets.filter((t) => t.quarter === quarter)
  const scopedTargets = filter.repId === 'ALL' ? targets : targets.filter((t) => t.repId === filter.repId)
  const scopedQuarterTargets = filter.repId === 'ALL' ? quarterTargets : quarterTargets.filter((t) => t.repId === filter.repId)

  const totalTarget = scopedTargets.reduce((a, t) => a + t.target, 0)
  const totalAchieved = scopedTargets.reduce((a, t) => a + t.achieved, 0)
  const overall = totalTarget ? Math.round((totalAchieved / totalTarget) * 100) : 0

  const qTarget = scopedQuarterTargets.reduce((a, t) => a + t.target, 0)
  const qAchieved = scopedQuarterTargets.reduce((a, t) => a + t.achieved, 0)
  const qPct = qTarget ? Math.round((qAchieved / qTarget) * 100) : 0

  const scopedProjects = projects.filter((p) => projectPassesFilter(p, filter))
  const scopedClientIds = new Set(scopedProjects.map((p) => p.clientId))
  const accounts = filter.clientId === 'ALL' ? scopedClientIds.size : 1

  const scopedDivisionIds = new Set(scopedProjects.map((p) => p.divisionId).filter((d): d is string => !!d))
  const divisionsCount = scopedDivisionIds.size
  const divWithProj = new Set(scopedProjects.filter((p) => p.divisionId).map((p) => p.divisionId)).size
  const divisionPenetration = divisionsCount ? Math.round((divWithProj / divisionsCount) * 100) : 0

  const scopedClientNames = filter.clientId === 'ALL' ? null : new Set(clients.filter((c) => c.id === filter.clientId).map((c) => c.name))
  const scopedInvoices = scopedClientNames ? invoices.filter((iv) => scopedClientNames.has(iv.clientName)) : invoices
  const billingToday = scopedInvoices.reduce((a, iv) => a + iv.amount, 0)

  // Lead→PO conversion needs CRM lead-stage data, which isn't wired into this
  // scope yet — falls back to the target-based conversion ratio as the
  // closest honest proxy rather than inventing a separate lead funnel here.
  const leadToPo = overall

  return [
    { cat: 'My Accounts', id: 'acc', label: 'No. of accounts', tone: 'brand', value: String(accounts), sub: 'Pharma companies you cover' },
    { cat: 'My Accounts', id: 'div', label: 'No. of divisions', tone: 'violet', value: String(divisionsCount), sub: 'Across your accounts' },
    { cat: 'My Accounts', id: 'pen', label: 'Division penetration', tone: 'teal', value: formatPercent(divisionPenetration, 0), sub: `${divWithProj} of ${divisionsCount} divisions active` },
    { cat: 'My Accounts', id: 'bill', label: 'Billing till today', tone: 'emerald', value: formatINR(billingToday), sub: 'Invoiced this year · your accounts' },
    { cat: 'Targets & Conversion', id: 'l2po', label: 'Lead → PO conversion', tone: 'amber', value: formatPercent(leadToPo, 0), sub: `${scopedTargets.length} target(s) tracked` },
    { cat: 'Targets & Conversion', id: 'tva', label: 'Target vs achievement', tone: 'brand', value: formatPercent(overall, 0), sub: `${formatINR(totalAchieved)} of ${formatINR(totalTarget)}` },
    { cat: 'Targets & Conversion', id: 'qtva', label: 'Quarterly target vs achievement', tone: 'violet', value: formatPercent(qPct, 0), sub: `${quarter} · ${formatINR(qAchieved)} of ${formatINR(qTarget)}` },
  ]
}

export function groupByCategory(tiles: SalesKpiTile[]): { cat: string; tiles: SalesKpiTile[] }[] {
  const order: string[] = []
  const byCat = new Map<string, SalesKpiTile[]>()
  for (const t of tiles) {
    if (!byCat.has(t.cat)) {
      byCat.set(t.cat, [])
      order.push(t.cat)
    }
    byCat.get(t.cat)!.push(t)
  }
  return order.map((cat) => ({ cat, tiles: byCat.get(cat)! }))
}

export type { SalesFilterState }
