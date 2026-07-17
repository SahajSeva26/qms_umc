import type { Project } from '@/types/project.types'

// Mirrors the vanilla-JS prototype's projects-manager.js PROJECTS seed shape.
// TODO: entirely mock/frontend-only — no backend endpoints exist for projects yet.
//
// IDs intentionally match the projectId values already referenced by
// features/camps/camps.mock.ts (PRJ-441, PRJ-440, PRJ-438, PRJ-437, PRJ-435,
// PRJ-432, PRJ-429, PRJ-422) plus two additional projects (PRJ-415, PRJ-418)
// seen only in the Gantt view, so camps/projects/gantt all read as one dataset.
// clientId/divisionId also match features/crm/clients/clients.mock.ts.

// People who can be a project's sales owner or coordinator — subset of the
// prototype's admin-data.js People roster, scoped to the roles the wizard's
// Team & Payment step actually filters by (/sales|key account/i, /camp
// coordinator|admin|operations/i).
export interface ProjectPerson {
  id: string
  name: string
  role: string
}

export const SALES_PEOPLE: ProjectPerson[] = [
  { id: 'p-arjun', name: 'Arjun Kapoor', role: 'Sales Head' },
  { id: 'p-riya', name: 'Riya Mehta', role: 'Key Account Manager' },
  { id: 'p-sneha', name: 'Sneha Nair', role: 'Key Account Manager' },
  { id: 'p-rohit', name: 'Rohit Gupta', role: 'Key Account Manager' },
]

export const COORDINATOR_PEOPLE: ProjectPerson[] = [
  { id: 'p-vikram', name: 'Sonia D', role: 'Camp Coordinator' },
  { id: 'p-tushar', name: 'Tushar K', role: 'Diet Camp Coordinator' },
  { id: 'p-sagar', name: 'Sagar J', role: 'Ops Manager — Screening' },
  { id: 'p-jagriti', name: 'Jagriti', role: 'Ops Manager — Diet' },
]

// Pharma-side marketing contacts, client-scoped (Team & Payment step).
export interface MarketingContact {
  id: string
  clientId: string
  name: string
  designation: string
}

export const MARKETING_CONTACTS: MarketingContact[] = [
  { id: 'mkt-sun-1', clientId: 'cli-sun', name: 'Mohan Rao', designation: 'Head Marketing — Cardio' },
  { id: 'mkt-sun-2', clientId: 'cli-sun', name: 'Kavita Pandey', designation: 'Brand Manager — DiabetoMax' },
  { id: 'mkt-cipla-1', clientId: 'cli-cipla', name: 'Anita Sharma', designation: 'GM Marketing' },
  { id: 'mkt-drr-1', clientId: 'cli-drr', name: 'Karthik Iyer', designation: 'Sr Brand Manager' },
  { id: 'mkt-abbott-1', clientId: 'cli-abbott', name: 'Rohan Khan', designation: 'Marketing Director' },
  { id: 'mkt-glenmark-1', clientId: 'cli-glenmark', name: 'Divya Pillai', designation: 'Product Manager' },
]

const defaultCancellation = { freeHoursPrior: 24, pctAllowed: 10, pctDeducted: 50 }
const defaultBookingHierarchy: Project['bookingHierarchy'] = ['MR', 'ASM', 'RM', 'HO']
const defaultReportFormat = ['Camps executed', 'Patients screened', 'Conversion %', 'Cancellation count']
const defaultTats = '24 hours · MOM submission\n48 hours · Slot confirmation\n72 hours · Patient data upload'

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)
}

function baseProject(overrides: Partial<Project> & Pick<Project, 'id' | 'name' | 'clientId' | 'divisionId' | 'therapy' | 'type'>): Project {
  return {
    mixedSubTypes: [],
    testsConducted: [],
    bookingLeadDays: 0,
    status: 'LIVE',
    executionMode: 'PO',
    poNo: '',
    poDate: daysFromNow(-90),
    poExpiry: daysFromNow(275),
    agreementNo: '',
    agreementStart: '',
    agreementExpiry: '',
    agreementDurationMonths: 12,
    agreementDoc: null,
    mailRef: '',
    mailAttachmentDoc: null,
    campCost: 25000,
    totalCamps: 0,
    campsDone: 0,
    valueBeforeGst: 0,
    gstPct: 18,
    gstAmount: 0,
    valueAfterGst: 0,
    additionalPatientCost: 500,
    campTimeSlots: ['9-13', '10-14'],
    cancellationPolicy: defaultCancellation,
    goLiveScope: 'STATE',
    goLiveDetails: [],
    bookingHierarchy: defaultBookingHierarchy,
    salesPersonId: 'p-riya',
    coordinatorId: 'p-vikram',
    marketingContactId: '',
    paymentTerms: 'Net 30',
    renewalReminderPct: 80,
    reportCadence: 'MONTHLY',
    reportFormat: defaultReportFormat,
    tats: defaultTats,
    sops: '',
    dietCharts: [],
    voidCamps: [],
    closeReason: '',
    healthScore: 80,
    startDate: daysFromNow(-90),
    endDate: daysFromNow(275),
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    statusHistory: [],
    pos: [],
    ...overrides,
  }
}

function withGst(p: Project): Project {
  const gstAmount = Math.round(p.valueBeforeGst * (p.gstPct / 100))
  return { ...p, gstAmount, valueAfterGst: p.valueBeforeGst + gstAmount }
}

function seedPo(p: Project): Project {
  if (p.executionMode !== 'PO' || !p.poNo) return p
  return {
    ...p,
    pos: [{ id: `po-${p.id}`, poNo: p.poNo, poDate: p.poDate, poExpiry: p.poExpiry, campCount: p.totalCamps, value: p.valueAfterGst, status: 'ACTIVE' }],
  }
}

const RAW: Project[] = [
  baseProject({
    id: 'PRJ-441', name: 'Sun Pharma · Cardio Care · Mumbai', clientId: 'cli-sun', divisionId: 'div-sun-cardio',
    therapy: 'Cardiology', type: 'Screening', testsConducted: ['tst-bp', 'tst-ecg', 'tst-lipid'],
    poNo: 'PO/SUN/2026/0418', poDate: '2026-04-18', poExpiry: '2027-04-18',
    totalCamps: 120, campsDone: 84, campCost: 28500, valueBeforeGst: 3420000,
    salesPersonId: 'p-riya', coordinatorId: 'p-vikram', marketingContactId: 'mkt-sun-1',
    goLiveDetails: ['MH'], startDate: '2026-04-18', endDate: '2027-04-18', healthScore: 86,
  }),
  baseProject({
    id: 'PRJ-440', name: "Dr Reddy's · OncoCare · National", clientId: 'cli-drr', divisionId: 'div-drr-onco',
    therapy: 'Oncology', type: 'Screening', testsConducted: ['tst-fbs', 'tst-hba1c'],
    poNo: 'PO/DRR/2026/0408', poDate: '2026-04-08', poExpiry: '2027-04-08',
    totalCamps: 80, campsDone: 51, campCost: 31200, valueBeforeGst: 2496000,
    salesPersonId: 'p-sneha', coordinatorId: 'p-vikram', marketingContactId: 'mkt-drr-1',
    goLiveScope: 'PAN_INDIA', startDate: '2026-04-08', endDate: '2027-04-08', healthScore: 91,
  }),
  baseProject({
    id: 'PRJ-438', name: 'Cipla · Endo Plus · South India', clientId: 'cli-cipla', divisionId: 'div-cipla-endo',
    therapy: 'Endocrinology', type: 'Lab', testsConducted: ['tst-fbs', 'tst-ppbs', 'tst-hba1c', 'tst-bca'],
    poNo: 'PO/CIP/2026/0322', poDate: '2026-03-22', poExpiry: '2027-03-22',
    totalCamps: 50, campsDone: 32, campCost: 26800, valueBeforeGst: 1340000,
    salesPersonId: 'p-sneha', coordinatorId: 'p-jagriti', marketingContactId: 'mkt-cipla-1',
    goLiveDetails: ['KA', 'TN', 'AP', 'TG', 'KL'], startDate: '2026-03-22', endDate: '2027-03-22', healthScore: 78,
  }),
  baseProject({
    id: 'PRJ-437', name: 'Abbott · Diabetes Care · Tier-2', clientId: 'cli-abbott', divisionId: 'div-abt-diab',
    therapy: 'Diabetes', type: 'Diet', testsConducted: ['tst-fbs', 'tst-ppbs', 'tst-hba1c'],
    poNo: 'PO/ABB/2026/0312', poDate: '2026-03-12', poExpiry: '2027-03-12',
    totalCamps: 70, campsDone: 48, campCost: 20800, valueBeforeGst: 1456000,
    salesPersonId: 'p-rohit', coordinatorId: 'p-jagriti', marketingContactId: 'mkt-abbott-1',
    goLiveDetails: ['MH', 'GJ'], startDate: '2026-03-12', endDate: '2027-03-12', healthScore: 72,
  }),
  baseProject({
    id: 'PRJ-435', name: 'Glenmark · Dermatology · West', clientId: 'cli-glenmark', divisionId: 'div-glen-derm',
    therapy: 'Dermatology', type: 'Diet', testsConducted: ['tst-bca'],
    poNo: 'PO/GLN/2026/0228', poDate: '2026-02-28', poExpiry: '2027-02-28',
    totalCamps: 40, campsDone: 22, campCost: 20364, valueBeforeGst: 814545,
    salesPersonId: 'p-rohit', coordinatorId: 'p-tushar', marketingContactId: 'mkt-glenmark-1',
    goLiveDetails: ['MH'], startDate: '2026-02-28', endDate: '2027-02-28', healthScore: 64,
  }),
  baseProject({
    id: 'PRJ-432', name: 'Cipla · Respiratory Care · Pan India', clientId: 'cli-cipla', divisionId: 'div-cipla-resp',
    therapy: 'Pulmonology', type: 'Screening', testsConducted: ['tst-spo2', 'tst-spiro'],
    poNo: 'PO/CIP/2026/0210', poDate: '2026-02-10', poExpiry: '2027-02-10',
    totalCamps: 50, campsDone: 30, campCost: 25000, valueBeforeGst: 1250000,
    salesPersonId: 'p-riya', coordinatorId: 'p-vikram', marketingContactId: 'mkt-cipla-1',
    goLiveScope: 'PAN_INDIA', startDate: '2026-02-10', endDate: '2027-02-10', healthScore: 74,
  }),
  baseProject({
    id: 'PRJ-429', name: 'Lupin · pilot screening', clientId: 'cli-lupin', divisionId: null,
    therapy: 'Cardiology', type: 'Screening', testsConducted: ['tst-bp'],
    poNo: 'PO/LUP/2026/0422', poDate: '2026-04-22', poExpiry: '2027-04-22',
    status: 'HOLD', totalCamps: 8, campsDone: 4, campCost: 15000, valueBeforeGst: 120000,
    salesPersonId: 'p-rohit', coordinatorId: 'p-vikram', marketingContactId: '',
    goLiveDetails: ['DL'], startDate: '2026-04-22', endDate: '2027-04-22', healthScore: 51,
  }),
  baseProject({
    id: 'PRJ-422', name: 'Fortis · employee wellness', clientId: 'cli-fortis', divisionId: null,
    therapy: 'Wellness', type: 'Lab', testsConducted: ['tst-bp', 'tst-fbs', 'tst-bca'],
    poNo: 'PO/FRT/2026/0102', poDate: '2026-01-02', poExpiry: '2027-01-02',
    status: 'HOLD', totalCamps: 24, campsDone: 0, campCost: 18500, valueBeforeGst: 444000,
    salesPersonId: 'p-riya', coordinatorId: 'p-jagriti', marketingContactId: '',
    goLiveDetails: ['HR'], startDate: '2026-01-02', endDate: '2027-01-02', healthScore: 70,
  }),
  // Gantt-only projects (visible in the Gantt screenshot's client groups, not
  // in the Project Management list screenshot's visible first page).
  baseProject({
    id: 'PRJ-415', name: "Dr Reddy's · Gastro Pro", clientId: 'cli-drr', divisionId: 'div-drr-derma',
    therapy: 'Hepatology', type: 'Screening', testsConducted: ['tst-fbs'],
    poNo: 'PO/DRR/2026/0115', poDate: '2026-01-15', poExpiry: '2026-12-31',
    totalCamps: 36, campsDone: 24, campCost: 22000, valueBeforeGst: 792000,
    salesPersonId: 'p-sneha', coordinatorId: 'p-vikram', marketingContactId: 'mkt-drr-1',
    goLiveDetails: ['TS', 'AP'], startDate: '2026-01-15', endDate: '2026-12-31', healthScore: 82,
  }),
  baseProject({
    id: 'PRJ-418', name: 'Zydus · CardiaCare · Gujarat', clientId: 'cli-zydus', divisionId: 'div-zyd-cardio',
    therapy: 'Cardiology', type: 'Screening', testsConducted: ['tst-bp', 'tst-ecg'],
    status: 'CLOSED', poNo: 'PO/ZYD/2025/0900', poDate: '2025-09-01', poExpiry: '2026-03-01',
    totalCamps: 30, campsDone: 30, campCost: 21000, valueBeforeGst: 630000,
    salesPersonId: 'p-rohit', coordinatorId: 'p-jagriti', marketingContactId: '',
    closeReason: 'PO fully executed — all 30 camps closed on schedule.',
    goLiveDetails: ['GJ'], startDate: '2025-09-01', endDate: '2026-03-01', healthScore: 95,
  }),
]

export const PROJECTS: Project[] = RAW.map(withGst).map(seedPo)
