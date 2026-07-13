// Mirrors the vanilla-JS prototype's dashboard-data.js shapes exactly.
// TODO: entirely mock/frontend-only — no backend endpoints exist for any of this yet.

export interface KpiValue {
  v: number
  ly?: number
  unit?: 'inr' | 'pct'
  camps?: { v: number; ly: number }
}

export interface CompanyRow {
  client: string
  divisions: number
  projects: number
  camps: number
  billing: number
  outstanding: number
  status: 'ACTIVE' | 'TRIAL' | 'PAUSED' | 'INACTIVE'
}

export interface CompanyData {
  totalCompanies: KpiValue
  totalDivisions: KpiValue
  accountPenetration: KpiValue
  totalBilling: KpiValue
  outstanding: KpiValue
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

export interface ProjectData {
  totalProjects: KpiValue
  screeningProjects: KpiValue
  dietProjects: KpiValue
  labProjects: KpiValue
  totalBilling: KpiValue
  outstanding: KpiValue
  breakdown: ProjectRow[]
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
  screeningProjects: KpiValue
  dietProjects: KpiValue
  totalBilling: KpiValue
  outstanding: KpiValue
  totalLeads: KpiValue
  followUps: KpiValue
  leadToPo: KpiValue
  leadsScreeningPrj: KpiValue
  leadsDietPrj: KpiValue
  leadsOther: KpiValue & { value: number }
  repBreakdown: RepRow[]
}

export interface ExpenseRow {
  head: string
  value: number
  share: number
  color?: string
}

export interface AccountsData {
  revenue: KpiValue
  expenses: KpiValue
  ebita: KpiValue
  ebitaMarginPct: KpiValue
  pat: KpiValue
  patMarginPct: KpiValue
  arOutstanding: KpiValue
  expectedCollection: { thisWeek: KpiValue; thisMonth: KpiValue; thisYear: KpiValue }
  paymentCycleDays: KpiValue
  expenseSplit: ExpenseRow[]
}

export interface SpecialtyRow {
  specialty: string
  count: number
  ly: number
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
  male: { v: number; share: number }
  female: { v: number; share: number }
  other: { v: number; share: number }
  interpretations: InterpretationRow[]
}

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
