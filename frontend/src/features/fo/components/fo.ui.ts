import type { Person } from '@/types/people.types'
import type { Camp } from '@/types/camp.types'
import { toast } from '@/components/ui/sonner'

// Shared UI-layer helpers for the FO Management screen (fo-manager.js port).
// Kept local to features/fo/components rather than fo.service.ts since these
// are pure display/derivation helpers over Person+Camp, not data-layer reads.

export type FoLiveStatus = 'AT_CAMP' | 'ON_ROUTE' | 'ACTIVE' | 'IDLE'

const NOT_CANCELLED: Camp['status'][] = ['CANCELLED', 'CANCELLED_CHARGED']

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

// foLiveStatus — today's camp (LIVE→AT_CAMP, CONFIRMED/REQUESTED→ON_ROUTE),
// else any upcoming non-cancelled camp→ACTIVE, else IDLE.
export function foLiveStatus(person: Person, camps: Camp[]): FoLiveStatus {
  const today = todayIso()
  const myCamps = camps.filter((c) => c.foId === person.id)
  const todayCamp = myCamps.find((c) => c.date?.slice(0, 10) === today)
  if (todayCamp) {
    if (todayCamp.status === 'LIVE') return 'AT_CAMP'
    if (todayCamp.status === 'CONFIRMED' || todayCamp.status === 'REQUESTED') return 'ON_ROUTE'
  }
  const upcoming = myCamps.some((c) => c.date?.slice(0, 10) > today && !NOT_CANCELLED.includes(c.status))
  if (upcoming) return 'ACTIVE'
  return 'IDLE'
}

export const STATUS_LABEL: Record<FoLiveStatus, string> = {
  AT_CAMP: 'At camp',
  ON_ROUTE: 'En route',
  ACTIVE: 'Active',
  IDLE: 'Idle',
}

export const STATUS_COLOR: Record<FoLiveStatus, string> = {
  AT_CAMP: 'var(--success)',
  ON_ROUTE: 'var(--qms-brand)',
  ACTIVE: 'var(--qms-teal)',
  IDLE: 'var(--qms-text-muted)',
}

export function initials(name: string) {
  return name.split(' ').map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

const TONE_GRADIENTS: Record<string, string> = {
  brand: 'linear-gradient(135deg, #3b6dff, #6a8bff)',
  teal: 'linear-gradient(135deg, #14b8a6, #2dd4bf)',
  amber: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
  rose: 'linear-gradient(135deg, #f43f5e, #fb7185)',
}

export function avatarGradient(person: Person) {
  return TONE_GRADIENTS[person.tone ?? 'brand'] ?? TONE_GRADIENTS.brand
}

export function personCamps(person: Person, camps: Camp[]) {
  return camps.filter((c) => c.foId === person.id)
}

export function closedCampsOf(camps: Camp[]) {
  return camps.filter((c) => c.status === 'CLOSED' || c.status === 'COMPLETE' || c.status === 'COMPLETE_WITHOUT_REPORT')
}

export function upcomingCampsOf(camps: Camp[]) {
  const today = todayIso()
  return camps.filter((c) => c.date?.slice(0, 10) >= today && !NOT_CANCELLED.includes(c.status))
}

export function cancelledCampsOf(camps: Camp[]) {
  return camps.filter((c) => NOT_CANCELLED.includes(c.status))
}

export function avgFeedback(camps: Camp[]): number {
  const rated = camps.filter((c) => c.feedback > 0)
  if (rated.length === 0) return 0
  return rated.reduce((sum, c) => sum + c.feedback, 0) / rated.length
}

// Not stubbed — real WhatsApp/Call/navigate integrations don't exist, so
// these are correctly toast-only per the task's stub-vs-plumbing rule.
export function stubWhatsApp(name: string) {
  toast.info(`WhatsApp message would be sent to ${name}`)
}
export function stubCall(name: string) {
  toast.info(`Calling ${name}…`)
}
export function stubReassign(name: string) {
  toast.info(`Reassign flow for ${name} would open here`)
}
export function stubOpenCamp(campId: string) {
  toast.info(`Open ${campId} in Camp Management`)
}
export function stubRecertify() {
  toast.info('Re-certification scheduled')
}

// ── empType config for the 3 Personnel tabs (QMS FO / 3rd-Party FO / 3rd-Party Manpower) ──
export type EmpTypeKey = 'qmsfo' | 'tpfo' | 'tpmp'

export interface EmpTypeConfig {
  empType: Person['empType']
  title: string
  label: string
  addLabel: string
  vendor: boolean
}

export const EMP_TYPE_CONFIG: Record<EmpTypeKey, EmpTypeConfig> = {
  qmsfo: { empType: 'QMS_FO', title: 'QMS FO Profile', label: 'QMS FO', addLabel: 'Add QMS FO', vendor: false },
  tpfo: { empType: 'TP_FO', title: '3rd-Party FO Profile', label: '3rd-Party FO', addLabel: 'Add 3rd-Party FO', vendor: true },
  tpmp: { empType: 'TP_MANPOWER', title: '3rd-Party Manpower', label: '3rd-Party Manpower', addLabel: 'Add 3rd-Party Manpower', vendor: true },
}

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? '')
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

// 15-column personnel export — mirrors CLAUDE.md task spec's column list.
// Column formulas match the prototype's personMetrics() exactly: pending =
// PENDING+APPROVED (not SUBMITTED), paid = PAID only (not APPROVED), rating =
// average of this person's own rated-closed-camp feedback (falling back to
// their stored feedbackAvg only when they have no rated camps), leaves = real
// count from the qms.fo.leaves store, not a hardcoded 0.
export function downloadPersonnelCsv(
  people: Person[],
  camps: Camp[],
  claims: { foId: string; status: string; amount: number }[],
  leaves: { foId: string }[],
  filename: string
): void {
  const header = ['ID', 'Name', 'HQ', 'Vendor', 'Phone', 'Email', 'Joined', 'Salary/mo', 'Camps executed', 'Camps cancelled', 'Pending TA-DA', 'Paid TA-DA', 'Rating', 'Leaves', 'Assets']
  const rows = people.map((p) => {
    const myCamps = personCamps(p, camps)
    const closed = myCamps.filter((c) => c.status === 'CLOSED')
    const executed = closed.length
    const cancelled = cancelledCampsOf(myCamps).length
    const myClaims = claims.filter((c) => c.foId === p.id)
    const pending = myClaims.filter((c) => c.status === 'PENDING' || c.status === 'APPROVED').reduce((s, c) => s + c.amount, 0)
    const paid = myClaims.filter((c) => c.status === 'PAID').reduce((s, c) => s + c.amount, 0)
    const rated = closed.filter((c) => c.feedback > 0)
    const avgFb = rated.length ? +(rated.reduce((s, c) => s + c.feedback, 0) / rated.length).toFixed(1) : (p.feedbackAvg ?? 0)
    const myLeaves = leaves.filter((l) => l.foId === p.id).length
    return [
      p.id, p.name, p.hq, p.vendor ?? '—', p.phone, p.email, p.joined,
      p.salaryInr ?? 0, executed, cancelled, pending, paid,
      avgFb, myLeaves, (p.machinesAssigned ?? []).length,
    ].map(escapeCsvCell).join(',')
  })
  const csv = [header.map(escapeCsvCell).join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  toast.success(`Exported ${people.length} record${people.length === 1 ? '' : 's'}`)
}
