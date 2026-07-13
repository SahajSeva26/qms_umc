import type {
  ApprovalRequest,
  ApprovalType,
  RepTarget,
  SalesData,
  SalesMeeting,
  SalesRep,
} from '@/types/salesdash.types'
import {
  ACTIVITY_FEED,
  APPROVAL_SEED,
  ASSIGNMENTS,
  QUARTER,
  REPS,
  TARGETS as TARGET_SEED,
} from '@/features/crm/sales/sales.mock'
import { computeTargetStatus } from '@/features/crm/sales/sales.utils'

const TARGETS_KEY = 'qms.targets'
const APPROVALS_KEY = 'qms.master.approvals'
const MEETINGS_KEY = 'qms.sales.meetings'

// Reps live in-memory only for the demo — 'Add sales person' does not persist
// across reloads (the people master is a separate upcoming module).
let repsStore: SalesRep[] = JSON.parse(JSON.stringify(REPS))

function loadTargets(): RepTarget[] {
  try {
    const raw = localStorage.getItem(TARGETS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // fall through to seed
  }
  return JSON.parse(JSON.stringify(TARGET_SEED))
}

function persistTargets(targets: RepTarget[]) {
  try {
    localStorage.setItem(TARGETS_KEY, JSON.stringify(targets))
  } catch {
    // demo persistence only — safe to ignore quota/serialization errors
  }
}

function loadApprovals(): ApprovalRequest[] {
  try {
    const raw = localStorage.getItem(APPROVALS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // fall through to seed
  }
  return JSON.parse(JSON.stringify(APPROVAL_SEED))
}

function persistApprovals(approvals: ApprovalRequest[]) {
  try {
    localStorage.setItem(APPROVALS_KEY, JSON.stringify(approvals))
  } catch {
    // demo persistence only — safe to ignore quota/serialization errors
  }
}

// Meetings are written by the Appointments module — read-only here.
function loadMeetings(): SalesMeeting[] {
  try {
    const raw = localStorage.getItem(MEETINGS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // fall through to empty
  }
  return []
}

// TODO: replace with real API calls once backend endpoints exist
export async function getSalesData(): Promise<SalesData> {
  return {
    reps: [...repsStore],
    targets: loadTargets(),
    assignments: JSON.parse(JSON.stringify(ASSIGNMENTS)),
    approvals: loadApprovals(),
    activityFeed: [...ACTIVITY_FEED],
    meetings: loadMeetings(),
  }
}

export interface AddRepInput {
  name: string
  role: SalesRep['role']
  hq: string
  phone: string
  email: string
  salaryInr: number
}

const NEW_REP_TONES = ['emerald', 'amber', 'violet', 'teal']

// TODO: replace with real API calls once backend endpoints exist
export async function addRep(input: AddRepInput): Promise<SalesRep[]> {
  const slug = input.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const rep: SalesRep = {
    id: `p-${slug || Date.now()}`,
    name: input.name.trim(),
    role: input.role,
    reportsTo: input.role === 'Key Account Manager' ? 'p-arjun' : undefined,
    hq: input.hq.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    joined: new Date().toISOString().slice(0, 10),
    relievedOn: null,
    tone: NEW_REP_TONES[repsStore.length % NEW_REP_TONES.length],
    salaryInr: input.salaryInr,
  }
  repsStore = [...repsStore, rep]
  return [...repsStore]
}

// TODO: replace with real API calls once backend endpoints exist
export async function setTarget(
  repId: string,
  target: number,
  rationale: string,
  setBy = 'Sales Head'
): Promise<RepTarget[]> {
  const targets = loadTargets()
  const existing = targets.find((t) => t.repId === repId && t.quarter === QUARTER)
  const setOn = new Date().toISOString().slice(0, 10)
  let next: RepTarget[]
  if (existing) {
    next = targets.map((t) =>
      t.id === existing.id
        ? { ...t, target, rationale, setBy, setOn, status: computeTargetStatus(target, t.achieved) }
        : t
    )
  } else {
    next = [
      ...targets,
      {
        id: `t-${repId}-${Date.now()}`,
        repId,
        quarter: QUARTER,
        target,
        achieved: 0,
        pipeline: 0,
        rationale,
        setBy,
        setOn,
        status: computeTargetStatus(target, 0),
      },
    ]
  }
  persistTargets(next)
  return next
}

// TODO: replace with real API calls once backend endpoints exist
export async function approveRequest(id: string, note: string, reviewedBy = 'Sales Head'): Promise<ApprovalRequest[]> {
  const next = loadApprovals().map((a) =>
    a.id === id
      ? {
          ...a,
          status: 'APPROVED' as const,
          reviewedBy,
          reviewedAt: new Date().toISOString(),
          ...(note.trim() ? { reviewNote: note.trim() } : {}),
        }
      : a
  )
  persistApprovals(next)
  return next
}

// TODO: replace with real API calls once backend endpoints exist
export async function rejectRequest(id: string, reason: string, reviewedBy = 'Sales Head'): Promise<ApprovalRequest[]> {
  const next = loadApprovals().map((a) =>
    a.id === id
      ? {
          ...a,
          status: 'REJECTED' as const,
          reviewedBy,
          reviewedAt: new Date().toISOString(),
          reviewNote: reason.trim(),
        }
      : a
  )
  persistApprovals(next)
  return next
}

// TODO: replace with real API calls once backend endpoints exist
export async function withdrawRequest(id: string): Promise<ApprovalRequest[]> {
  const next = loadApprovals().map((a) => (a.id === id ? { ...a, status: 'WITHDRAWN' as const } : a))
  persistApprovals(next)
  return next
}

// TODO: replace with real API calls once backend endpoints exist
export async function submitRequest(
  type: ApprovalType,
  record: Record<string, string>,
  submittedBy = 'Riya Mehta',
  submittedByEmail = 'riya@qms.health'
): Promise<ApprovalRequest[]> {
  const next: ApprovalRequest[] = [
    {
      id: `ar-${Date.now()}`,
      type,
      record,
      status: 'PENDING',
      submittedBy,
      submittedByEmail,
      submittedAt: new Date().toISOString(),
    },
    ...loadApprovals(),
  ]
  persistApprovals(next)
  return next
}
