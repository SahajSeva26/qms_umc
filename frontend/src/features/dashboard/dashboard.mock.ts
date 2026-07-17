import type {
  CompanyData,
  ProjectData,
  FoData,
  SalesData,
  AccountsData,
  DoctorsData,
  PatientsData,
  DashboardTask,
} from '@/types/dashboard.types'

// TODO: entirely mock — no backend endpoints exist for dashboard data yet.
// Values copied from the vanilla-JS prototype's dashboard-data.js so the
// numbers/labels match the design reference exactly.

export const FILTERS = {
  dateRanges: [
    { id: '7D', label: 'Last 7 days', factor: 0.2 },
    { id: '30D', label: 'Last 30 days', factor: 0.85 },
    { id: 'MTD', label: 'Month to date', factor: 0.62 },
    { id: 'QTD', label: 'Quarter to date', factor: 1.0 },
    { id: 'YTD', label: 'Year to date', factor: 2.2 },
    { id: 'FY', label: 'Full FY', factor: 3.4 },
  ],
  clients: ['All clients', "Sun Pharma", 'Cipla', "Dr Reddy's", 'Lupin', 'Zydus', 'Abbott India', 'Glenmark', 'Fortis Healthcare'],
  divisions: ['All divisions', 'Cardio Care', 'DiabetoMax', 'Respiratory Care', 'Endo Plus', 'OncoCare', 'Gastro Pro', 'Diabetes Care', 'Cardio Excellence', 'Dermatology'],
  campTypes: ['All', 'Screening', 'Diet', 'Lab'],
  salesPeople: ['All reps', 'Aman Verma', 'Arjun Kapoor', 'Riya Mehta', 'Sneha Nair', 'Rohit Sharma'],
}

const CLIENT_MULTIPLIERS: Record<string, number> = {
  'Sun Pharma': 0.2, Cipla: 0.16, "Dr Reddy's": 0.14, Lupin: 0.1,
  Zydus: 0.08, 'Abbott India': 0.14, Glenmark: 0.1, 'Fortis Healthcare': 0.08,
}

export function rangeFactor(dateRangeId: string): number {
  return FILTERS.dateRanges.find((r) => r.id === dateRangeId)?.factor ?? 1
}

export function clientMultiplier(client: string): number {
  return client === 'All clients' ? 1 : (CLIENT_MULTIPLIERS[client] ?? 1)
}

export function repMultiplier(rep: string): number {
  return rep === 'All reps' ? 1 : 0.25
}

export function effFactor(dateRangeId: string, client: string, rep: string): number {
  return rangeFactor(dateRangeId) * clientMultiplier(client) * repMultiplier(rep)
}

// Applies the effective filter factor to a KpiValue, matching the prototype's
// miniKpi() behavior: percentage values are shown as-is, everything else scales.
export function scaleKpi<T extends { v: number; unit?: 'inr' | 'pct' }>(kpi: T, factor: number): T {
  if (kpi.unit === 'pct') return kpi
  return { ...kpi, v: Math.round(kpi.v * factor) }
}

export const COMPANY: CompanyData = {
  totalCompanies: { v: 8, ly: 6 },
  totalDivisions: { v: 24, ly: 18 },
  accountPenetration: { v: 67, ly: 54, unit: 'pct' },
  totalBilling: { v: 41200000, ly: 32400000, unit: 'inr' },
  outstanding: { v: 8400000, ly: 6100000, unit: 'inr' },
  breakdown: [
    { client: 'Sun Pharma', divisions: 4, projects: 18, camps: 84, billing: 8420000, outstanding: 1840000, status: 'ACTIVE' },
    { client: 'Cipla', divisions: 3, projects: 14, camps: 62, billing: 6210000, outstanding: 1240000, status: 'ACTIVE' },
    { client: "Dr Reddy's", divisions: 3, projects: 15, camps: 51, billing: 5840000, outstanding: 980000, status: 'ACTIVE' },
    { client: 'Abbott India', divisions: 4, projects: 12, camps: 48, billing: 5580000, outstanding: 1410000, status: 'ACTIVE' },
    { client: 'Glenmark', divisions: 2, projects: 8, camps: 22, billing: 2240000, outstanding: 620000, status: 'ACTIVE' },
    { client: 'Lupin', divisions: 3, projects: 6, camps: 14, billing: 1840000, outstanding: 810000, status: 'TRIAL' },
    { client: 'Fortis Healthcare', divisions: 2, projects: 2, camps: 0, billing: 1840000, outstanding: 840000, status: 'PAUSED' },
    { client: 'Zydus', divisions: 3, projects: 4, camps: 9, billing: 1220000, outstanding: 460000, status: 'INACTIVE' },
  ],
}

export const PROJECT: ProjectData = {
  totalProjects: { v: 66, ly: 48 },
  screeningProjects: { v: 32, ly: 24, camps: { v: 612, ly: 484 } },
  dietProjects: { v: 18, ly: 14, camps: { v: 184, ly: 142 } },
  labProjects: { v: 12, ly: 8, camps: { v: 96, ly: 72 } },
  totalBilling: { v: 41200000, ly: 32400000, unit: 'inr' },
  outstanding: { v: 8400000, ly: 6100000, unit: 'inr' },
  breakdown: [
    { id: 'PRJ-441', name: 'Sun Pharma · Cardio Care · Mumbai', type: 'Screening', camps: 84, billing: 8420000, outstanding: 1840000, health: 86, owner: 'Riya Mehta', status: 'LIVE' },
    { id: 'PRJ-440', name: "Dr Reddy's · OncoCare · National", type: 'Screening', camps: 51, billing: 4850000, outstanding: 980000, health: 82, owner: 'Arjun Kapoor', status: 'LIVE' },
    { id: 'PRJ-438', name: 'Cipla · Endo Plus · South India', type: 'Diet', camps: 62, billing: 3210000, outstanding: 620000, health: 74, owner: 'Sneha Nair', status: 'LIVE' },
    { id: 'PRJ-437', name: 'Abbott · Diabetes Care · Tier-2', type: 'Screening', camps: 48, billing: 5840000, outstanding: 1410000, health: 68, owner: 'Arjun Kapoor', status: 'LIVE' },
    { id: 'PRJ-435', name: 'Glenmark · Dermatology · West', type: 'Lab', camps: 22, billing: 2240000, outstanding: 620000, health: 91, owner: 'Riya Mehta', status: 'LIVE' },
    { id: 'PRJ-432', name: 'Cipla · Respiratory Care · Pan India', type: 'Diet', camps: 14, billing: 3000000, outstanding: 0, health: 79, owner: 'Sneha Nair', status: 'LIVE' },
    { id: 'PRJ-429', name: 'Lupin · Cardio Excellence · North', type: 'Screening', camps: 14, billing: 1840000, outstanding: 810000, health: 55, owner: 'Rohit Sharma', status: 'PILOT' },
    { id: 'PRJ-422', name: 'Fortis Healthcare · Gastro Pro', type: 'Lab', camps: 0, billing: 1840000, outstanding: 840000, health: 41, owner: 'Rohit Sharma', status: 'PAUSED' },
  ],
}

export const FO: FoData = {
  occupancyRate: { v: 92, ly: 84, unit: 'pct' },
  efficiencyRate: { v: 88, ly: 82, unit: 'pct' },
  activeFOs: { v: 38, ly: 24 },
  regionalSpread: [
    { region: 'West (MH/GJ/RJ)', fos: 12, camps: 286, share: 38 },
    { region: 'South (KA/TN/KL/TS)', fos: 14, camps: 224, share: 30 },
    { region: 'North (DL/UP/HR/PB)', fos: 7, camps: 132, share: 17 },
    { region: 'East (WB/OD/JH)', fos: 3, camps: 62, share: 9 },
    { region: 'Central (MP/CG)', fos: 2, camps: 56, share: 6 },
  ],
  campTimeBifurcation: [
    { slot: '9 AM – 1 PM', count: 184, share: 30 },
    { slot: '10 AM – 2 PM', count: 248, share: 41 },
    { slot: '11 AM – 3 PM', count: 96, share: 16 },
    { slot: '6 PM – 10 PM', count: 84, share: 13 },
  ],
  topFOs: [
    { name: 'Ravi Kumar', hq: 'Pune', camps: 64, occ: 96, eff: 92, fb: 4.7 },
    { name: 'Anita Desai', hq: 'Delhi NCR', camps: 56, occ: 92, eff: 88, fb: 4.6 },
    { name: 'Amit Singh', hq: 'Bengaluru', camps: 51, occ: 90, eff: 87, fb: 4.5 },
    { name: 'Pooja S.', hq: 'Ahmedabad', camps: 48, occ: 89, eff: 85, fb: 4.4 },
  ],
}

export const SALES: SalesData = {
  totalProjects: { v: 66, ly: 48 },
  screeningProjects: { v: 32, ly: 24, camps: { v: 612, ly: 484 } },
  dietProjects: { v: 18, ly: 14, camps: { v: 184, ly: 142 } },
  totalBilling: { v: 41200000, ly: 32400000, unit: 'inr' },
  outstanding: { v: 8400000, ly: 6100000, unit: 'inr' },
  totalLeads: { v: 1245, ly: 880 },
  followUps: { v: 312, ly: 240 },
  leadToPo: { v: 34.6, ly: 28.2, unit: 'pct' },
  leadsScreeningPrj: { v: 720, camps: { v: 612, ly: 484 } },
  leadsDietPrj: { v: 240, camps: { v: 184, ly: 142 } },
  leadsOther: { v: 285, value: 14400000 },
  repBreakdown: [
    { rep: 'Arjun Kapoor', target: 18000000, achieved: 14100000, leads: 184, conv: 38, projects: 18 },
    { rep: 'Riya Mehta', target: 12000000, achieved: 9420000, leads: 142, conv: 34, projects: 14 },
    { rep: 'Sneha Nair', target: 9000000, achieved: 5400000, leads: 128, conv: 30, projects: 11 },
    { rep: 'Rohit Sharma', target: 6000000, achieved: 6420000, leads: 84, conv: 42, projects: 6 },
  ],
}

export const ACCOUNTS: AccountsData = {
  revenue: { v: 41200000, ly: 32400000, unit: 'inr' },
  expenses: { v: 28400000, ly: 22600000, unit: 'inr' },
  ebita: { v: 12800000, ly: 9800000, unit: 'inr' },
  ebitaMarginPct: { v: 31.1, ly: 30.2, unit: 'pct' },
  pat: { v: 8900000, ly: 6800000, unit: 'inr' },
  patMarginPct: { v: 21.6, ly: 20.9, unit: 'pct' },
  arOutstanding: { v: 8400000, ly: 6100000, unit: 'inr' },
  expectedCollection: {
    thisWeek: { v: 1240000, unit: 'inr' },
    thisMonth: { v: 4820000, unit: 'inr' },
    thisYear: { v: 8400000, unit: 'inr' },
  },
  paymentCycleDays: { v: 38, ly: 46 },
  expenseSplit: [
    { head: 'FO salary + DA/TA', value: 9800000, share: 35, color: '#2451f0' },
    { head: 'Devices & calibration', value: 4200000, share: 15, color: '#14b8a6' },
    { head: 'Consumables', value: 5600000, share: 20, color: '#7c5cff' },
    { head: 'Logistics', value: 2200000, share: 8, color: '#f59e0b' },
    { head: 'Software / SaaS', value: 1680000, share: 6, color: '#10b981' },
    { head: 'Marketing & ops', value: 4920000, share: 16, color: '#0ea5e9' },
  ],
}

export const DOCTORS: DoctorsData = {
  total: { v: 1864, ly: 1240 },
  bySpecialty: [
    { specialty: 'GP', count: 412, ly: 280 },
    { specialty: 'Cardiologist', count: 320, ly: 210 },
    { specialty: 'Diabetologist/Endo', count: 280, ly: 180 },
    { specialty: 'Pulmonologist', count: 184, ly: 120 },
    { specialty: 'Orthopedic', count: 152, ly: 102 },
    { specialty: 'Gynaecologist', count: 138, ly: 92 },
    { specialty: 'Neurologist', count: 96, ly: 68 },
    { specialty: 'Hepatologist', count: 82, ly: 54 },
    { specialty: 'Nephrologist', count: 72, ly: 46 },
    { specialty: 'Ophthalmologist', count: 68, ly: 44 },
    { specialty: 'CP (Chest)', count: 44, ly: 28 },
    { specialty: 'Others', count: 16, ly: 16 },
  ],
}

export const PATIENTS: PatientsData = {
  total: { v: 28430, ly: 19200 },
  male: { v: 16200, share: 57 },
  female: { v: 11800, share: 42 },
  other: { v: 430, share: 1 },
  interpretations: [
    {
      project: 'Diabetes screening', total: 4820,
      classes: [
        { label: 'Normal', count: 2840, severity: 'NORMAL' },
        { label: 'Pre-diabetes', count: 1240, severity: 'MEDIUM' },
        { label: 'Diabetes', count: 740, severity: 'HIGH' },
      ],
    },
    {
      project: 'Cardio screening (BP)', total: 6240,
      classes: [
        { label: 'Normal', count: 3920, severity: 'NORMAL' },
        { label: 'Pre-HTN', count: 1480, severity: 'MEDIUM' },
        { label: 'Stage 1 HTN', count: 620, severity: 'HIGH' },
        { label: 'Stage 2 HTN', count: 220, severity: 'HIGH' },
      ],
    },
    {
      project: 'Lipid profile', total: 3120,
      classes: [
        { label: 'Desirable', count: 1820, severity: 'NORMAL' },
        { label: 'Borderline', count: 840, severity: 'MEDIUM' },
        { label: 'High', count: 340, severity: 'HIGH' },
        { label: 'Very high', count: 120, severity: 'HIGH' },
      ],
    },
    {
      project: 'Body composition', total: 2840,
      classes: [
        { label: 'Normal', count: 1240, severity: 'NORMAL' },
        { label: 'Overweight', count: 1080, severity: 'MEDIUM' },
        { label: 'Obese', count: 520, severity: 'HIGH' },
      ],
    },
  ],
}

export const QUARTER = 'Q2 FY26'

export const TASKS: DashboardTask[] = [
  { id: 't1', kind: 'MOM', title: 'Submit MOM · Lupin', detail: 'Meeting ended 2026-07-09 06:30', ownerName: 'Sneha Nair', ownerTone: 'amber', status: 'PENDING', canAct: true },
  { id: 't2', kind: 'LEAD', title: 'Follow up · Novartis', detail: 'L-2408 · stage new · 16d stuck', ownerName: 'Riya Mehta', ownerTone: 'teal', status: 'PENDING', canAct: true },
  { id: 't3', kind: 'MOM', title: 'Submit MOM · Sun Pharma', detail: 'Meeting ended 2026-07-08 09:30', ownerName: 'Riya Mehta', ownerTone: 'teal', status: 'PENDING', canAct: true },
  { id: 't4', kind: 'MOM', title: 'Submit MOM · Sun Pharma', detail: 'Meeting ended 2026-07-07 06:00', ownerName: 'Riya Mehta', ownerTone: 'teal', status: 'PENDING', canAct: true },
  { id: 't5', kind: 'MOM', title: "Submit MOM · Dr Reddy's", detail: 'Meeting ended 2026-07-07 11:30', ownerName: 'Arjun Kapoor', ownerTone: 'brand', status: 'PENDING', canAct: true },
]
