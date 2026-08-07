import type { ClientInvoice } from '@/types/client.types'

// TODO: entirely mock — no backend endpoints exist for client management yet.
// IDs and project numbers line up with camps.mock.ts / dashboard.mock.ts so the
// modules read as one dataset.

// Re-exported for existing in-feature imports — the canonical CLIENTS/DIVISIONS/
// MRS/PROJECTS data now lives in types/client.types.ts so other features (e.g.
// projects, doctors, hq, diet) can read it through the shared types layer
// instead of reaching into this feature's internal mock file.
export { CLIENTS, DIVISIONS, MRS, PROJECTS } from '@/types/client.types'

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
