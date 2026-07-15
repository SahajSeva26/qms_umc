import type {
  ActivityItem,
  ApprovalRequest,
  RepTarget,
  SalesRep,
} from '@/types/salesdash.types'
import { QUARTER, ASSIGNMENTS } from '@/types/salesdash.types'

// Re-exported for existing in-feature imports — the canonical QUARTER/
// ASSIGNMENTS now live in types/salesdash.types.ts so other features can
// read them without reaching into this file.
export { QUARTER, ASSIGNMENTS }

export const REPS: SalesRep[] = [
  {
    id: 'p-riya',
    name: 'Riya Mehta',
    role: 'Key Account Manager',
    reportsTo: 'p-arjun',
    hq: 'Mumbai',
    phone: '+91 98200 11223',
    email: 'riya@qms.health',
    joined: '2024-06-10',
    relievedOn: null,
    tone: 'teal',
    salaryInr: 75000,
  },
  {
    id: 'p-sneha',
    name: 'Sneha Nair',
    role: 'Key Account Manager',
    reportsTo: 'p-arjun',
    hq: 'Bengaluru',
    phone: '+91 98450 33441',
    email: 'sneha@qms.health',
    joined: '2024-11-02',
    relievedOn: null,
    tone: 'violet',
    salaryInr: 72000,
  },
  {
    id: 'p-rohit',
    name: 'Rohit Sharma',
    role: 'Key Account Manager',
    reportsTo: 'p-arjun',
    hq: 'Delhi NCR',
    phone: '+91 98100 55667',
    email: 'rohit@qms.health',
    joined: '2023-08-19',
    relievedOn: '2026-05-04',
    tone: 'rose',
    salaryInr: 70000,
  },
  {
    id: 'p-arjun',
    name: 'Arjun Kapoor',
    role: 'Sales Head',
    hq: 'Mumbai',
    phone: '+91 98920 77889',
    email: 'arjun@qms.health',
    joined: '2022-04-01',
    relievedOn: null,
    tone: 'brand',
    salaryInr: 140000,
  },
]

export const TARGETS: RepTarget[] = [
  {
    id: 't-riya',
    repId: 'p-riya',
    quarter: QUARTER,
    target: 12000000,
    achieved: 9420000,
    pipeline: 4200000,
    rationale: 'Mumbai cluster has 2.1× faster conversion; carry Sun+Cipla anchor accounts',
    setBy: 'Aman Verma',
    setOn: '2026-04-02',
    status: 'ON_TRACK',
  },
  {
    id: 't-sneha',
    repId: 'p-sneha',
    quarter: QUARTER,
    target: 9000000,
    achieved: 5400000,
    pipeline: 2600000,
    rationale: 'Bengaluru respiratory portfolio is ramping; Cipla Resp division is the anchor bet',
    setBy: 'Aman Verma',
    setOn: '2026-04-02',
    status: 'AT_RISK',
  },
  {
    id: 't-rohit',
    repId: 'p-rohit',
    quarter: QUARTER,
    target: 6000000,
    achieved: 6420000,
    pipeline: 800000,
    rationale: 'Reduced load for notice period; close out committed Delhi NCR renewals only',
    setBy: 'Aman Verma',
    setOn: '2026-04-02',
    status: 'EXCEEDED',
  },
  {
    id: 't-arjun',
    repId: 'p-arjun',
    quarter: QUARTER,
    target: 18000000,
    achieved: 14100000,
    pipeline: 6800000,
    rationale: 'Head target covers Abbott + Dr Reddy\'s strategic accounts and overflow escalations',
    setBy: 'Aman Verma',
    setOn: '2026-04-02',
    status: 'ON_TRACK',
  },
]

export const CLIENT_NAMES: Record<string, string> = {
  'cli-sun': 'Sun Pharma',
  'cli-cipla': 'Cipla',
  'cli-drreddys': "Dr Reddy's",
  'cli-abbott': 'Abbott India',
  'cli-glenmark': 'Glenmark',
}

export const APPROVAL_SEED: ApprovalRequest[] = [
  {
    id: 'ar-1',
    type: 'CLIENT',
    record: { name: 'Novartis India', city: 'Mumbai', state: 'MH', contact: 'Rajiv Menon' },
    status: 'PENDING',
    submittedBy: 'Riya Mehta',
    submittedByEmail: 'riya@qms.health',
    submittedAt: '2026-07-07T10:20:00+05:30',
    note: 'Met their cardio marketing head at Mumbai HQ — wants a camp pilot this quarter',
  },
  {
    id: 'ar-2',
    type: 'DIVISION',
    record: { name: 'Onco Plus', therapy: 'Oncology' },
    status: 'APPROVED',
    submittedBy: 'Sneha Nair',
    submittedByEmail: 'sneha@qms.health',
    submittedAt: '2026-07-02T15:40:00+05:30',
    reviewedBy: 'Arjun Kapoor',
    reviewedAt: '2026-07-03T09:05:00+05:30',
  },
  {
    id: 'ar-3',
    type: 'BRAND',
    record: { name: 'CardioMax' },
    status: 'REJECTED',
    submittedBy: 'Riya Mehta',
    submittedByEmail: 'riya@qms.health',
    submittedAt: '2026-06-28T11:10:00+05:30',
    reviewedBy: 'Arjun Kapoor',
    reviewedAt: '2026-06-29T17:30:00+05:30',
    reviewNote: 'Duplicate of existing brand',
  },
]

export const ACTIVITY_FEED: ActivityItem[] = [
  { tone: 'green', title: 'Call with Sun Pharma — pilot debrief positive', meta: 'Riya M. · 18 min ago' },
  { tone: '', title: 'Proposal v2 sent to Cipla Endo division', meta: 'Auto · 31 min ago' },
  { tone: 'amber', title: 'L-2419 entered Negotiation — SLA 5 days', meta: 'System · 1 hr ago' },
  { tone: 'green', title: 'PO received — Abbott India ₹84.2 L', meta: 'Vikram P. · 4 hr ago' },
  { tone: 'rose', title: 'L-2401 marked Lost — pricing mismatch', meta: 'Arjun K. · 1 d ago' },
]
