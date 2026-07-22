import type { Person } from '@/types/people.types'
import type { DeviceCatalogItem } from '@/types/device.types'

// TODO: entirely mock — no backend endpoints exist for a people/staff master
// yet. IDs deliberately match the FO/dietitian ids already referenced by
// camps.mock.ts (p-ravi/p-anita/p-amit/p-pooja, diet-01) and camps.refs.ts's
// FO_NAMES lookup, so camp records resolve against real roster entries
// instead of a second, disconnected id space. Names/roles copied from the
// vanilla-JS prototype's admin-data.js PEOPLE array where the same ids exist.

export const PEOPLE: Person[] = [
  // ── Field Officers (QMS payroll) ──────────────────────────────────────
  { id: 'p-ravi', name: 'Ankit', role: 'Field Officer', phone: '+91 9820011001', email: 'ankit@qms.health', hq: 'Mumbai', states: ['MH'], city: 'Mumbai', joined: '2024-02-12', empType: 'QMS_FO', salaryInr: 32000, campsPerDay: 2, machinesAssigned: ['dev-bp', 'dev-spo', 'dev-ecg'], occupancyPct: 92, efficiencyPct: 88, feedbackAvg: 4.6 },
  { id: 'p-anita', name: 'Anita Desai', role: 'Field Officer', phone: '+91 9845022002', email: 'anita.desai@qms.health', hq: 'Bengaluru', states: ['KA'], city: 'Bengaluru', joined: '2024-03-01', empType: 'QMS_FO', salaryInr: 30000, campsPerDay: 2, machinesAssigned: ['dev-glucometer'], occupancyPct: 86, efficiencyPct: 84, feedbackAvg: 4.4 },
  { id: 'p-amit', name: 'Amit Singh', role: 'Field Officer', phone: '+91 9791033003', email: 'amit.singh@qms.health', hq: 'Chennai', states: ['TN'], city: 'Chennai', joined: '2024-01-20', empType: 'QMS_FO', salaryInr: 31000, campsPerDay: 2, machinesAssigned: ['dev-bp', 'dev-spo', 'dev-lipid'], occupancyPct: 90, efficiencyPct: 87, feedbackAvg: 4.3 },
  { id: 'p-pooja', name: 'Pooja S.', role: 'Field Officer', phone: '+91 9820044004', email: 'pooja.s@qms.health', hq: 'Mumbai', states: ['MH'], city: 'Mumbai', joined: '2024-05-10', empType: 'TP_FO', vendor: 'Reliant Manpower Svcs', salaryInr: 26000, campsPerDay: 1, machinesAssigned: ['dev-derm'], occupancyPct: 78, efficiencyPct: 81, feedbackAvg: 4.1 },

  // ── Dietitians ─────────────────────────────────────────────────────────
  { id: 'diet-01', name: 'Sneha Kulkarni', role: 'Dietitian', phone: '+91 9845055005', email: 'sneha.kulkarni@qms.health', hq: 'Bengaluru', states: ['KA'], city: 'Bengaluru', joined: '2024-04-18', specialty: 'Clinical Nutrition · CDE', ratePerCamp: 2800, printingChargePerCamp: 150, feedbackAvg: 4.5 },
  { id: 'diet-02', name: 'Rohit Bhatia', role: 'Dietitian', phone: '+91 9910066006', email: 'rohit.bhatia@qms.health', hq: 'Delhi', states: ['DL'], city: 'Delhi', joined: '2024-06-02', specialty: 'Sports Nutrition', ratePerCamp: 2600, printingChargePerCamp: 150, feedbackAvg: 4.2 },

  // ── Coordinators ───────────────────────────────────────────────────────
  { id: 'p-vikram', name: 'Sonia D', role: 'Camp Coordinator', phone: '+91 9820077007', email: 'sonia.d@qms.health', hq: 'Bengaluru', states: ['KA', 'TN'], city: 'Bengaluru', joined: '2023-11-05' },
  { id: 'p-tushar', name: 'Tushar K', role: 'Diet Camp Coordinator', phone: '+91 9820088008', email: 'tushar.k@qms.health', hq: 'Mumbai', states: ['MH', 'KA'], city: 'Mumbai', joined: '2023-12-01' },
]

export const DEVICE_CATALOG: DeviceCatalogItem[] = [
  { id: 'dev-bp', name: 'Omron HEM-7156', category: 'BP Monitor', unitsAvailable: 24 },
  { id: 'dev-spo', name: 'BPL SpO2 Pro', category: 'Pulse Oximeter', unitsAvailable: 30 },
  { id: 'dev-ecg', name: 'BPL Cardiart 6108T', category: 'ECG (12-lead)', unitsAvailable: 12 },
  { id: 'dev-spirom', name: 'Vitalograph Spiro', category: 'Spirometer', unitsAvailable: 10 },
  { id: 'dev-lipid', name: 'Roche Cobas h232', category: 'Lipid Analyser', unitsAvailable: 8 },
  { id: 'dev-bdy', name: 'Tanita BC-545N', category: 'Body Composition', unitsAvailable: 14 },
  { id: 'dev-glucometer', name: 'Accu-Chek Instant', category: 'Glucometer', unitsAvailable: 40 },
  { id: 'dev-derm', name: 'Dermlite DL4', category: 'Dermatoscope', unitsAvailable: 6 },
]
