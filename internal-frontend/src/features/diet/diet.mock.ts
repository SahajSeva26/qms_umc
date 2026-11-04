import type { Dietitian, TeleConsult } from '@/features/diet/diet.types'

// TODO: entirely mock — ids match camps.mock.ts's dietitianId references
// (diet-01) so seeded Diet camps resolve against a real roster entry.

export const DIETITIANS: Dietitian[] = [
  {
    id: 'diet-01', code: 'DT-BLR-01', name: 'Sneha Kulkarni', email: 'sneha.kulkarni@qms.health', phone: '+91 9845055005',
    qualification: 'M.Sc. Clinical Nutrition · CDE', resumeUrl: '/resumes/sneha-kulkarni.pdf', interviewed: true,
    remuneration: 2800, ta: 450, da: 200, printing: 150,
    address: 'HSR Layout, Bengaluru', gmap: 'https://maps.google.com/?q=HSR+Layout+Bengaluru',
    state: 'KA', city: 'Bengaluru', machinesAssigned: ['dev-bdy'], status: 'ACTIVE', joined: '2024-04-18',
  },
  {
    id: 'diet-02', code: 'DT-DEL-01', name: 'Rohit Bhatia', email: 'rohit.bhatia@qms.health', phone: '+91 9910066006',
    qualification: 'Sports Nutrition Diploma', resumeUrl: '/resumes/rohit-bhatia.pdf', interviewed: true,
    remuneration: 2600, ta: 400, da: 200, printing: 150,
    address: 'Saket, Delhi', state: 'DL', city: 'Delhi', machinesAssigned: [], status: 'ACTIVE', joined: '2024-06-02',
  },
  {
    id: 'diet-03', code: 'DT-MUM-02', name: 'Farah Sheikh', email: 'farah.sheikh@qms.health', phone: '+91 9820099009',
    qualification: 'B.Sc. Dietetics', resumeUrl: '', interviewed: false,
    remuneration: 2400, ta: 350, da: 150, printing: 150,
    address: 'Andheri, Mumbai', state: 'MH', city: 'Mumbai', machinesAssigned: [], status: 'ON_HOLD', joined: '2025-01-10',
  },
]

function dPlus(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)
}

export const TELE_CONSULTS: TeleConsult[] = [
  { id: 'TC-2001', patientName: 'Ramesh Gowda', phone: '+91 9900011111', condition: 'Type 2 Diabetes', dietitianId: 'diet-01', clientId: 'cli-cipla', date: dPlus(-1), time: '11:00', mode: 'Video', status: 'COMPLETED', notes: 'Follow-up in 2 weeks', plan: 'Low-GI diet, 1800 kcal/day' },
  { id: 'TC-2002', patientName: 'Meena Iyer', phone: '+91 9900022222', condition: 'PCOS', dietitianId: 'diet-01', clientId: 'cli-cipla', date: dPlus(0), time: '15:00', mode: 'Video', status: 'SCHEDULED', notes: '', plan: '' },
  { id: 'TC-2003', patientName: 'Suresh Nair', phone: '+91 9900033333', condition: 'Obesity', dietitianId: 'diet-02', clientId: 'cli-abbott', date: dPlus(1), time: '10:30', mode: 'Phone', status: 'SCHEDULED', notes: '', plan: '' },
]
