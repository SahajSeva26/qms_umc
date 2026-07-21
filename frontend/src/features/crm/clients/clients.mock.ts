import type {
  ClientInvoice,
  ClientProject,
} from '@/types/client.types'

// TODO: entirely mock — no backend endpoints exist for client management yet.
// IDs and project numbers line up with camps.mock.ts / dashboard.mock.ts so the
// modules read as one dataset.

// Re-exported for existing in-feature imports — the canonical CLIENTS/DIVISIONS/MRS
// data now lives in types/client.types.ts so other features (e.g. projects,
// doctors) can read it through the shared types layer instead of reaching into
// this feature's internal mock file.
export { CLIENTS, DIVISIONS, MRS } from '@/types/client.types'

export const PROJECTS: ClientProject[] = [
  {
    id: 'PRJ-441', name: 'Sun Pharma · Cardio Care · Mumbai', clientId: 'cli-sun', divisionId: 'div-sun-cardio',
    type: 'Screening', poNo: 'PO/SUN/2026/0418', poValueInr: 8420000, poDate: '2026-01-12',
    campsTarget: 120, campsDone: 84, status: 'LIVE',
    pos: [
      { id: 'po-sun-0418', poNo: 'PO/SUN/2026/0418', confirmationType: 'PO', poDate: '2026-01-12', poExpiry: '2026-12-31', campCount: 120, value: 8420000, status: 'ACTIVE' },
    ],
  },
  {
    id: 'PRJ-438', name: 'Cipla · Endo Plus · South India', clientId: 'cli-cipla', divisionId: 'div-cipla-endo',
    type: 'Diet', poNo: 'PO/CIP/2026/0233', poValueInr: 3210000, poDate: '2026-02-03',
    campsTarget: 90, campsDone: 62, status: 'LIVE', pos: [], coordinatorId: 'p-tushar', campCost: 4200,
  },
  {
    id: 'PRJ-448', name: 'Abbott · Weight Management · West', clientId: 'cli-abbott', divisionId: 'div-abt-diab',
    type: 'Diet', poNo: 'PO/ABT/2026/0455', poValueInr: 2100000, poDate: '2026-04-08',
    campsTarget: 50, campsDone: 9, status: 'LIVE', pos: [], coordinatorId: 'p-tushar', campCost: 3800,
  },
  {
    id: 'PRJ-440', name: "Dr Reddy's · OncoCare · National", clientId: 'cli-drr', divisionId: 'div-drr-onco',
    type: 'Screening', poNo: 'AGR/DRR/2026/0107', poValueInr: 4850000, poDate: '2026-01-20',
    campsTarget: 80, campsDone: 51, status: 'LIVE', pos: [],
  },
  {
    id: 'PRJ-437', name: 'Abbott · Diabetes Care · Tier-2', clientId: 'cli-abbott', divisionId: 'div-abt-diab',
    type: 'Screening', poNo: 'PO/ABT/2026/0342', poValueInr: 5840000, poDate: '2026-02-14',
    campsTarget: 75, campsDone: 48, status: 'LIVE', pos: [],
  },
  {
    id: 'PRJ-435', name: 'Glenmark · Dermatology · West', clientId: 'cli-glenmark', divisionId: 'div-glen-derm',
    type: 'Lab', poNo: 'PO/GLN/2026/0289', poValueInr: 2240000, poDate: '2026-03-02',
    campsTarget: 40, campsDone: 22, status: 'LIVE', pos: [],
  },
  {
    id: 'PRJ-432', name: 'Cipla · Respiratory Care · Pan India', clientId: 'cli-cipla', divisionId: 'div-cipla-resp',
    type: 'Diet', poNo: 'PO/CIP/2026/0198', poValueInr: 3000000, poDate: '2026-01-28',
    campsTarget: 36, campsDone: 14, status: 'LIVE', pos: [], coordinatorId: 'p-tushar', campCost: 4000,
  },
  {
    id: 'PRJ-429', name: 'Lupin · Cardio Excellence · North', clientId: 'cli-lupin', divisionId: null,
    type: 'Screening', poNo: 'MAIL/LUP/2026/0075', poValueInr: 1840000, poDate: '2026-03-18',
    campsTarget: 30, campsDone: 14, status: 'PILOT', pos: [],
  },
  {
    id: 'PRJ-422', name: 'Fortis Healthcare · Gastro Pro', clientId: 'cli-fortis', divisionId: null,
    type: 'Lab', poNo: 'PO/FRT/2025/0512', poValueInr: 1840000, poDate: '2025-11-06',
    campsTarget: 20, campsDone: 0, status: 'PAUSED', pos: [],
  },
]

// NOTE: invoices join to clients by NAME (not id) — this mirrors the vanilla-JS
// prototype's billing data quirk. Keep the name join when computing billing /
// outstanding KPIs so the numbers match the design reference.
export const INVOICES: ClientInvoice[] = [
  { id: 'inv-9001', clientName: 'Sun Pharma', divisionId: 'div-sun-cardio', amount: 2450000, status: 'PAID', date: '2026-05-18', project: 'Sun Pharma · Cardio Care · Mumbai', due: '2026-06-17', age: 0 },
  { id: 'inv-9002', clientName: 'Sun Pharma', divisionId: 'div-sun-cardio', amount: 1840000, status: 'SENT', date: '2026-06-22', project: 'Sun Pharma · Cardio Care · Mumbai', due: '2026-07-22', age: 0 },
  { id: 'inv-9003', clientName: 'Sun Pharma', divisionId: 'div-sun-diabeto', amount: 720000, status: 'OVERDUE', date: '2026-05-05', project: 'Sun Pharma · DiabetoMax', due: '2026-06-04', age: 39 },
  { id: 'inv-9004', clientName: 'Cipla', divisionId: 'div-cipla-endo', amount: 1210000, status: 'PAID', date: '2026-05-28', project: 'Cipla · Endo Plus · South India', due: '2026-06-27', age: 0 },
  { id: 'inv-9005', clientName: 'Cipla', divisionId: 'div-cipla-resp', amount: 980000, status: 'OVERDUE', date: '2026-04-30', project: 'Cipla · Respiratory Care · Pan India', due: '2026-05-30', age: 44 },
  { id: 'inv-9006', clientName: "Dr Reddy's", divisionId: 'div-drr-onco', amount: 1620000, status: 'SENT', date: '2026-06-30', project: "Dr Reddy's · OncoCare · National", due: '2026-07-30', age: 0 },
  { id: 'inv-9007', clientName: 'Abbott India', divisionId: 'div-abt-diab', amount: 2140000, status: 'PAID', date: '2026-05-12', project: 'Abbott · Diabetes Care · Tier-2', due: '2026-06-11', age: 0 },
  { id: 'inv-9008', clientName: 'Abbott India', divisionId: 'div-abt-diab', amount: 1410000, status: 'SENT', date: '2026-06-25', project: 'Abbott · Diabetes Care · Tier-2', due: '2026-07-25', age: 0 },
  { id: 'inv-9009', clientName: 'Glenmark', divisionId: 'div-glen-derm', amount: 860000, status: 'OVERDUE', date: '2026-04-15', project: 'Glenmark · Dermatology · West', due: '2026-05-15', age: 59 },
]

// Same slot ids the Camps module uses ('qms.master.camps' records store the id).
export const SLOT_OPTIONS = [
  { id: '9-1', label: '9 AM – 1 PM' },
  { id: '10-2', label: '10 AM – 2 PM' },
  { id: '11-3', label: '11 AM – 3 PM' },
  { id: '6-10', label: '6 PM – 10 PM' },
]
