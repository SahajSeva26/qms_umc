import { accessManagementService } from '@/features/access-management/accessManagement.service'
import { projectsService } from '@/features/projects/projects.service'
import { crmService } from '@/features/crm/crm.service'
import { appointmentsRealService } from '@/features/crm/appointments/appointmentsReal.service'
import { doctorsService } from '@/features/doctors/doctors.service'
import { SPECIALIZATION_OPTIONS } from '@/types/doctor.types'
import { patientService } from '@/features/clinical/patient/patient.service'
import { inventoryAssignmentService } from '@/features/inventory/real/inventoryAssignment.service'
import { invoiceService } from '@/features/billing/invoice.service'
import type {
  AccountsData,
  CommandCenterData,
  CompanyData,
  CompanyRow,
  DashboardData,
  DoctorsData,
  FoData,
  HeadlineKpi,
  KpiValue,
  PatientsData,
  ProjectData,
  SalesData,
} from '@/types/dashboard.types'

// Real-or-null: `v: null` means no backend aggregation/permission exists for this metric (renders
// "-"); a thrown request is recorded into `errored` instead, driving one small page-level notice.
// No mock fallback in production. Permission gates are passed in by the caller (DashboardPage) since
// this is a plain function, not a hook. Revenue/Expenses/EBITA/PAT/AR stay permanently null — there
// is no accounting model backing them; invoice totals are wired separately under invoice terms only.

const NO_VALUE: KpiValue = { v: null }

/** Runs a real fetch. Never throws — failures are reported via `errored`. */
async function attempt<T>(fn: () => Promise<T>): Promise<{ value: T | undefined; errored: boolean }> {
  try {
    return { value: await fn(), errored: false }
  } catch {
    return { value: undefined, errored: true }
  }
}

async function loadCompany(base: CompanyData): Promise<{ data: CompanyData; errored: boolean }> {
  // "Company-wise" means pharma clients only — excludes QMS's own platform tenant.
  // firstPage.data.count below already IS the total customer-tenant count — no separate request needed.
  const { value: firstPage, errored: firstPageErrored } = await attempt(() =>
    accessManagementService.searchTenants({ type: 'customer', report: 'true', limit: '20', page: '1' }),
  )
  if (!firstPage?.data) return { data: base, errored: firstPageErrored }

  let data = { ...base, totalCompanies: { v: firstPage.data.count } }

  // 20/page, backend-enforced, no artificial page cap — fetches every page. Aggregate sums only
  // populate once ALL pages succeed, else a missing page would silently understate the total.
  const totalPages = Math.ceil(firstPage.data.count / 20)
  const restPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      attempt(() => accessManagementService.searchTenants({ type: 'customer', report: 'true', limit: '20', page: String(i + 2) })),
    ),
  )
  const pagesErrored = restPages.some((p) => p.errored)
  if (pagesErrored) return { data, errored: true }

  const allItems = [firstPage.data.items, ...restPages.map((p) => p.value!.data!.items)].flat()

  const breakdown: CompanyRow[] = allItems.map((t) => ({
    client: t.name,
    divisions: t.stats?.totalDivisions ?? 0,
    projects: t.stats?.totalProjects ?? 0,
    camps: t.stats?.totalCamps ?? 0,
    billing: t.stats?.billed ?? 0,
    outstanding: 0, // no unpaid/overdue aggregation exists
    status: (t.status === 'inactive' ? 'INACTIVE' : 'ACTIVE') as 'ACTIVE' | 'INACTIVE',
  }))

  data = {
    ...data,
    totalDivisions: { v: allItems.reduce((sum, t) => sum + (t.stats?.totalDivisions ?? 0), 0) },
    totalBilling: { v: allItems.reduce((sum, t) => sum + (t.stats?.billed ?? 0), 0), unit: 'inr' },
    breakdown,
  }

  return { data, errored: firstPageErrored }
}

async function loadProject(base: ProjectData, canViewProjectReport: boolean): Promise<{ data: ProjectData; errored: boolean }> {
  const { value: res, errored } = await attempt(() => projectsService.searchProjects({ report: 'true', limit: '1' }))
  const byType = res?.data?.report?.byType
  let data = base
  if (byType) {
    const countFor = (type: string) => byType.find((b) => b.type === type)?.count ?? 0
    data = {
      ...data,
      totalProjects: { v: res!.data.count },
      screeningProjects: { v: countFor('screening') },
      dietProjects: { v: countFor('diet') },
      labProjects: { v: countFor('lab') },
    }
  }

  // project:manage/tenant:manage only — skipped entirely otherwise, never fired to eat a 403.
  if (!canViewProjectReport) return { data, errored }
  const { value: reportRes, errored: reportErrored } = await attempt(() => projectsService.getProjectReport())
  const byStatus = reportRes?.data?.byStatus
  if (byStatus) {
    data = {
      ...data,
      statusMix: byStatus.map((s) => ({ status: s.status, count: s.count })),
      // campCost * totalCamps per project, summed server-side — an estimate, not actual invoiced revenue.
      estimatedValue: { v: byStatus.reduce((sum, s) => sum + s.revenue, 0), unit: 'inr' },
    }
  }
  return { data, errored: errored || reportErrored }
}

async function loadSales(
  base: SalesData,
  canViewLeadReport: boolean,
  canViewAppointmentReport: boolean,
): Promise<{ data: SalesData; errored: boolean }> {
  // /leads/report needs lead:manage; a lead:search-only rep gets a 403, so fall back to a plain
  // scoped count — pipelineValue/leadWinRate have no equivalent there and stay "-".
  const [leadRes, leadCountRes, appointmentRes] = await Promise.all([
    canViewLeadReport ? attempt(() => crmService.getLeadReport({})) : Promise.resolve({ value: undefined, errored: false }),
    canViewLeadReport ? Promise.resolve({ value: undefined, errored: false }) : attempt(() => crmService.searchLeads({ limit: '1' })),
    canViewAppointmentReport
      ? attempt(() => appointmentsRealService.getAppointmentReport())
      : Promise.resolve({ value: undefined, errored: false }),
  ])

  let data = base
  if (leadRes.value?.data) {
    data = {
      ...data,
      totalLeads: { v: leadRes.value.data.summary.totalLeads },
      pipelineValue: { v: leadRes.value.data.kpis.pipelineValue, unit: 'inr' },
      leadWinRate: { v: leadRes.value.data.kpis.winRate, unit: 'pct' },
    }
  } else if (leadCountRes.value?.data) {
    data = { ...data, totalLeads: { v: leadCountRes.value.data.count } }
  }
  const followUpCount = appointmentRes.value?.data?.byType?.find((t) => t.type === 'follow-up')?.count
  if (followUpCount !== undefined) {
    data = { ...data, followUpAppointments: { v: followUpCount } }
  }

  return { data, errored: leadRes.errored || leadCountRes.errored || appointmentRes.errored }
}

async function loadFo(base: FoData, canViewInventoryAssignmentReport: boolean): Promise<{ data: FoData; errored: boolean }> {
  // inventory-assignment:manage only, skipped entirely otherwise.
  if (!canViewInventoryAssignmentReport) return { data: base, errored: false }
  const { value: res, errored } = await attempt(() => inventoryAssignmentService.getInventoryAssignmentReport())
  if (!res?.data) return { data: base, errored }
  // totalFieldOfficers = every active FO role, not just ones holding stock — don't swap for
  // fieldOfficersHoldingInventory, a materially smaller, different number.
  return { data: { ...base, activeFOs: { v: res.data.summary.totalFieldOfficers } }, errored }
}

async function loadAccounts(base: AccountsData, canViewInvoiceReport: boolean): Promise<{ data: AccountsData; errored: boolean }> {
  if (!canViewInvoiceReport) return { data: base, errored: false }
  const { value: res, errored } = await attempt(() => invoiceService.getInvoiceReport())
  if (!res?.data) return { data: base, errored }
  return {
    errored,
    data: {
      ...base,
      totalInvoices: { v: res.data.totalInvoices },
      totalInvoicedAmount: { v: res.data.totalInvoiced, unit: 'inr' },
      invoiceStatusMix: res.data.statusCounts.map((s) => ({ status: s.status, count: s.count, total: s.total })),
    },
  }
}

async function loadDoctors(base: DoctorsData): Promise<{ data: DoctorsData; errored: boolean }> {
  const { value: res, errored: totalErrored } = await attempt(() => doctorsService.searchDoctors({ limit: '1' }))
  let data = base
  if (res?.data !== undefined) data = { ...data, total: { v: res.data.count } }

  // No by-specialty aggregation endpoint — 12 parallel limit:1 searches give an exact count each.
  // Temporary high-call approach, not a pattern to repeat for larger enums. A failed specialty is
  // dropped from the list, never shown as a fabricated 0.
  const specialtyResults = await Promise.all(
    SPECIALIZATION_OPTIONS.map(async (opt) => {
      const { value: specRes, errored: specErrored } = await attempt(() => doctorsService.searchDoctors({ specialization: opt.value, limit: '1' }))
      return { label: opt.label, count: specRes?.data?.count, errored: specErrored }
    }),
  )
  const bySpecialty = specialtyResults
    .filter((r) => r.count !== undefined)
    .map((r) => ({ specialty: r.label, count: r.count! }))
  if (bySpecialty.length > 0) data = { ...data, bySpecialty }

  const specialtyErrored = specialtyResults.some((r) => r.errored)
  return { data, errored: totalErrored || specialtyErrored }
}

async function loadPatients(base: PatientsData, canSearchPatients: boolean): Promise<{ data: PatientsData; errored: boolean }> {
  // GET /patients needs patient:search/patient:manage — the Dashboard route only guarantees
  // tenant:manage, so skip entirely rather than firing 4 guaranteed 403s for a caller without it.
  if (!canSearchPatients) return { data: base, errored: false }
  // No gender-aggregation endpoint, but `gender` is a real unscoped search filter — 3 parallel
  // limit:1 searches give an exact per-gender count, each independent so one failing leaves only
  // that gender "-" rather than substituting a fabricated 0.
  const [totalRes, maleRes, femaleRes, otherRes] = await Promise.all([
    attempt(() => patientService.searchPatients({ limit: '1' })),
    attempt(() => patientService.searchPatients({ gender: 'male', limit: '1' })),
    attempt(() => patientService.searchPatients({ gender: 'female', limit: '1' })),
    attempt(() => patientService.searchPatients({ gender: 'other', limit: '1' })),
  ])

  let data = base
  if (totalRes.value?.data) data = { ...data, total: { v: totalRes.value.data.count } }

  const total = totalRes.value?.data?.count
  const shareOf = (n: number) => (total && total > 0 ? Math.round((n / total) * 100) : null)

  if (maleRes.value?.data) data = { ...data, male: { v: maleRes.value.data.count, share: shareOf(maleRes.value.data.count) } }
  if (femaleRes.value?.data) data = { ...data, female: { v: femaleRes.value.data.count, share: shareOf(femaleRes.value.data.count) } }
  if (otherRes.value?.data) data = { ...data, other: { v: otherRes.value.data.count, share: shareOf(otherRes.value.data.count) } }

  return { data, errored: totalRes.errored || maleRes.errored || femaleRes.errored || otherRes.errored }
}

const EMPTY_COMPANY: CompanyData = { totalCompanies: NO_VALUE, totalDivisions: NO_VALUE, totalBilling: NO_VALUE, breakdown: [] }
const EMPTY_PROJECT: ProjectData = {
  totalProjects: NO_VALUE,
  screeningProjects: NO_VALUE,
  dietProjects: NO_VALUE,
  labProjects: NO_VALUE,
  estimatedValue: NO_VALUE,
  outstanding: NO_VALUE,
  breakdown: [],
  statusMix: [],
}
const EMPTY_FO: FoData = {
  occupancyRate: NO_VALUE,
  efficiencyRate: NO_VALUE,
  activeFOs: NO_VALUE,
  regionalSpread: [],
  campTimeBifurcation: [],
  topFOs: [],
}
const EMPTY_SALES: SalesData = {
  totalProjects: NO_VALUE,
  totalBilling: NO_VALUE,
  outstanding: NO_VALUE,
  totalLeads: NO_VALUE,
  followUpAppointments: NO_VALUE,
  pipelineValue: NO_VALUE,
  leadWinRate: NO_VALUE,
  repBreakdown: [],
}
const EMPTY_ACCOUNTS: AccountsData = {
  revenue: NO_VALUE,
  expenses: NO_VALUE,
  ebita: NO_VALUE,
  ebitaMarginPct: NO_VALUE,
  pat: NO_VALUE,
  patMarginPct: NO_VALUE,
  arOutstanding: NO_VALUE,
  arAging: [],
  expectedCollection: { thisWeek: NO_VALUE, thisMonth: NO_VALUE, thisYear: NO_VALUE },
  paymentCycleDays: NO_VALUE,
  expenseSplit: [],
  totalInvoices: NO_VALUE,
  totalInvoicedAmount: NO_VALUE,
  invoiceStatusMix: [],
}
const EMPTY_DOCTORS: DoctorsData = { total: NO_VALUE, bySpecialty: [] }
const EMPTY_PATIENTS: PatientsData = {
  total: NO_VALUE,
  male: { v: null, share: null },
  female: { v: null, share: null },
  other: { v: null, share: null },
  interpretations: [],
}

export interface DashboardPermissionFlags {
  canViewProjectReport: boolean
  canViewLeadReport: boolean
  canViewAppointmentReport: boolean
  canViewInventoryAssignmentReport: boolean
  canViewInvoiceReport: boolean
  canSearchPatients: boolean
}

export async function getDashboardData(flags: DashboardPermissionFlags): Promise<DashboardData> {
  const [company, project, sales, fo, accounts, doctors, patients] = await Promise.all([
    loadCompany(EMPTY_COMPANY),
    loadProject(EMPTY_PROJECT, flags.canViewProjectReport),
    loadSales(EMPTY_SALES, flags.canViewLeadReport, flags.canViewAppointmentReport),
    loadFo(EMPTY_FO, flags.canViewInventoryAssignmentReport),
    loadAccounts(EMPTY_ACCOUNTS, flags.canViewInvoiceReport),
    loadDoctors(EMPTY_DOCTORS),
    loadPatients(EMPTY_PATIENTS, flags.canSearchPatients),
  ])

  // sales.data.totalProjects comes from project's own count (not a second GET /projects request).
  const salesData = { ...sales.data, totalProjects: project.data.totalProjects }

  const hasLoadError = [company, project, fo, sales, accounts, doctors, patients].some((r) => r.errored)

  const headline: HeadlineKpi[] = [
    { id: 'totalBilling', label: 'Total Billing', data: company.data.totalBilling },
    { id: 'arOutstanding', label: 'AR Outstanding', data: accounts.data.arOutstanding },
    { id: 'ebita', label: 'EBITA', data: accounts.data.ebita },
    { id: 'projects', label: 'Projects', data: project.data.totalProjects },
    { id: 'activeFos', label: 'Active FOs', data: fo.data.activeFOs },
    { id: 'leads', label: 'Leads', data: salesData.totalLeads },
    { id: 'doctors', label: 'Doctors', data: doctors.data.total },
    { id: 'patients', label: 'Patients', data: patients.data.total },
  ]

  return {
    headline,
    company: company.data,
    project: project.data,
    fo: fo.data,
    sales: salesData,
    accounts: accounts.data,
    doctors: doctors.data,
    patients: patients.data,
    hasLoadError,
  }
}

export async function getCommandCenterData(): Promise<CommandCenterData> {
  // No task/MOM/activity module exists in the backend yet.
  return { quarter: '', tasks: [] }
}
