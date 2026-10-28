// Dashboard contract — every KPI value is real-or-null. `v: null` renders as "-"; no mock
// fallback in production. Empty breakdown/table/chart arrays render as "Live data not available".

export interface KpiValue {
  v: number | null
  unit?: 'inr' | 'pct'
  camps?: { v: number | null }
}

export interface CompanyRow {
  client: string
  divisions: number
  projects: number
  camps: number
  billing: number
  outstanding: number
  status: 'ACTIVE' | 'INACTIVE'
}

export interface CompanyData {
  totalCompanies: KpiValue
  totalDivisions: KpiValue
  totalBilling: KpiValue
  breakdown: CompanyRow[]
}

export interface ProjectRow {
  id: string
  name: string
  type: 'Screening' | 'Diet' | 'Lab'
  camps: number
  billing: number
  outstanding: number
  health: number
  owner: string
  status: 'LIVE' | 'PILOT' | 'PAUSED'
}

// Real backend status values (project.constants.ts's PROJECT_STATUS) — there is no
// pilot/paused concept; `hold` is the closest real equivalent to "paused".
export interface ProjectStatusRow {
  status: 'new' | 'live' | 'hold' | 'closed'
  count: number
}

export interface ProjectData {
  totalProjects: KpiValue
  screeningProjects: KpiValue
  dietProjects: KpiValue
  labProjects: KpiValue
  // campCost * totalCamps summed across all projects (GET /projects/report's revenue aggregate) —
  // an estimate of project value, not actual invoiced/collected billing.
  estimatedValue: KpiValue
  outstanding: KpiValue
  breakdown: ProjectRow[]
  // Real, org-wide status counts from GET /projects/report (project:manage/tenant:manage only) —
  // empty for a caller without that permission, not derived from `breakdown`.
  statusMix: ProjectStatusRow[]
}

export interface RegionRow {
  region: string
  fos: number
  camps: number
  share: number
}

export interface TimeSlotRow {
  slot: string
  count: number
  share: number
}

export interface TopFoRow {
  name: string
  hq: string
  camps: number
  occ: number
  eff: number
  fb: number
}

export interface FoData {
  occupancyRate: KpiValue
  efficiencyRate: KpiValue
  activeFOs: KpiValue
  regionalSpread: RegionRow[]
  campTimeBifurcation: TimeSlotRow[]
  topFOs: TopFoRow[]
}

export interface RepRow {
  rep: string
  target: number
  achieved: number
  leads: number
  conv: number
  projects: number
}

export interface SalesData {
  totalProjects: KpiValue
  totalBilling: KpiValue
  outstanding: KpiValue
  totalLeads: KpiValue
  // GET /appointments/report's byType 'follow-up' bucket (appointment:manage only) — an exact,
  // unscoped org-wide count, not a per-user own-scoped search count.
  followUpAppointments: KpiValue
  // GET /leads/report's kpis.pipelineValue — Σ estimatedValue over open (non-won/lost) leads.
  pipelineValue: KpiValue
  // Lead-stage win rate (won/(won+lost) in range) — NOT a lead-to-PO conversion rate.
  leadWinRate: KpiValue
  repBreakdown: RepRow[]
}

export interface ExpenseRow {
  head: string
  value: number
  share: number
  color?: string
}

export interface ArAgingBucket {
  label: string
  value: number
}

export interface InvoiceStatusRow {
  status: 'draft' | 'approved' | 'issued' | 'grn_signed' | 'paid' | 'cancelled'
  count: number
  total: number
}

export interface AccountsData {
  revenue: KpiValue
  expenses: KpiValue
  ebita: KpiValue
  ebitaMarginPct: KpiValue
  pat: KpiValue
  patMarginPct: KpiValue
  arOutstanding: KpiValue
  arAging: ArAgingBucket[]
  expectedCollection: { thisWeek: KpiValue; thisMonth: KpiValue; thisYear: KpiValue }
  paymentCycleDays: KpiValue
  expenseSplit: ExpenseRow[]
  // From GET /invoices/report — kept under invoice terms, never folded into revenue/EBITDA/AR above.
  totalInvoices: KpiValue
  totalInvoicedAmount: KpiValue
  invoiceStatusMix: InvoiceStatusRow[]
}

export interface SpecialtyRow {
  specialty: string
  count: number
}

export interface DoctorsData {
  total: KpiValue
  bySpecialty: SpecialtyRow[]
}

export interface InterpretationClass {
  label: string
  count: number
  severity: 'NORMAL' | 'MEDIUM' | 'HIGH'
}

export interface InterpretationRow {
  project: string
  total: number
  classes: InterpretationClass[]
}

export interface PatientsData {
  total: KpiValue
  male: { v: number | null; share: number | null }
  female: { v: number | null; share: number | null }
  other: { v: number | null; share: number | null }
  interpretations: InterpretationRow[]
}

// No task/MOM/activity module exists in the backend — getCommandCenterData() always returns an
// empty task list. Kept as a real (if permanently empty) type, not a mock data shape.
export interface DashboardTask {
  id: string
  kind: 'MEETING' | 'MOM' | 'LEAD' | 'PO' | 'CUSTOM'
  title: string
  detail: string
  ownerName?: string
  ownerTone?: string
  status: 'PENDING' | 'SNOOZED' | 'DONE'
  snoozeUntil?: string
  canAct: boolean
}

export interface CommandCenterData {
  quarter: string
  tasks: DashboardTask[]
}

// SERVICE CONTRACT — the shape dashboard.service.ts returns. Lives here (not in features/dashboard/)
// because useDashboardDataShared.ts exposes the same contract to Analytics.

/** A headline KPI tile. The UI renders `data` verbatim — no client-side scaling/derivation. */
export interface HeadlineKpi {
  id: string
  label: string
  data: KpiValue
}

export interface DashboardData {
  headline: HeadlineKpi[]
  company: CompanyData
  project: ProjectData
  fo: FoData
  sales: SalesData
  accounts: AccountsData
  doctors: DoctorsData
  patients: PatientsData
  // True when at least one real section request failed (not merely "no endpoint exists").
  // The page renders one small non-blocking notice when this is true.
  hasLoadError: boolean
}
