import type { Camp } from '@/types/camp.types'
import type { Person } from '@/types/people.types'
import type { DeviceCatalogItem } from '@/types/device.types'
import type { DietitianRateEntry } from '@/features/om/om.types'
import { dietitianExpense } from '@/features/om/om.service'
import { clientName } from '@/types/campref.types'

// Mirrors renderDietDashboardSections() exactly (om-portal.js:581-743) — the
// OM·Diet-only 6-panel sub-dashboard bolted onto the Dashboard tab. Unscoped
// (sees ALL diet projects, unlike the Diet Coord Workspace which is scoped).

function isoDate(d: Date) { return d.toISOString().slice(0, 10) }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return isoDate(d) }

export interface DailyCounts {
  todayCount: number
  last7Count: number
  monthCount: number
  dayBuckets: { date: string; count: number }[]
}

export function dailyDietCampCounts(dietCamps: Camp[]): DailyCounts {
  const today = isoDate(new Date())
  const monthStart = today.slice(0, 7) + '-01'
  const last7 = daysAgo(7)
  const last30 = daysAgo(30)

  const todayCount = dietCamps.filter((c) => c.date === today).length
  const last7Count = dietCamps.filter((c) => c.date >= last7 && c.date <= today).length
  const monthCount = dietCamps.filter((c) => c.date >= monthStart && c.date <= today).length

  const dayCounts: Record<string, number> = {}
  dietCamps.forEach((c) => { if (c.date) dayCounts[c.date] = (dayCounts[c.date] ?? 0) + 1 })
  const dayBuckets = Object.entries(dayCounts)
    .filter(([d]) => d >= last30 && d <= today)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))

  return { todayCount, last7Count, monthCount, dayBuckets }
}

function isPendingCamp(c: Camp): boolean {
  const s = (c.status ?? '').toUpperCase()
  return !s.includes('CANCEL') && s !== 'CLOSED'
}

export interface PharmaRow {
  clientId: string
  pharma: string
  pending: number
  requested: number
  withDietitian: number
  withoutDietitian: number
  totalValue: number
}

// Pending camps · pharma-wise — mirrors om-portal.js:596-605 exactly.
export function pendingByPharma(dietCamps: Camp[]): PharmaRow[] {
  const pending = dietCamps.filter(isPendingCamp)
  const map: Record<string, PharmaRow> = {}
  pending.forEach((c) => {
    const id = c.clientId || 'UNKNOWN'
    if (!map[id]) map[id] = { clientId: id, pharma: clientName(id) || id, pending: 0, requested: 0, withDietitian: 0, withoutDietitian: 0, totalValue: 0 }
    map[id].pending++
    if ((c.status ?? '').toUpperCase() === 'REQUESTED') map[id].requested++
    if (c.dietitianId) map[id].withDietitian++
    else map[id].withoutDietitian++
    map[id].totalValue += dietitianExpense(c, [], undefined).total
  })
  return Object.values(map).sort((a, b) => b.pending - a.pending)
}

// isBca — mirrors om-portal.js:607-613: matches camp.tests/testsConducted OR
// an allocated device whose catalog category/name mentions BCA/body comp.
export function isBcaCamp(camp: Camp, devices: DeviceCatalogItem[]): boolean {
  const tests = [
    ...((camp as unknown as { tests?: string[] }).tests ?? []),
    ...((camp as unknown as { testsConducted?: string[] }).testsConducted ?? []),
  ]
  if (tests.some((t) => /\bBCA\b|body\s*comp|composition|fat\s*analys/i.test(String(t)))) return true
  return camp.devicesAllocated.some((devId) => {
    const d = devices.find((x) => x.id === devId)
    return d && /\bBCA\b|body\s*comp|composition/i.test(`${d.category} ${d.name}`)
  })
}

export interface BcaLocationRow {
  city: string
  state: string
  camps: number
  patientsExpected: number
  patientsDone: number
  transportCost: number
}

// BCA Scale · location-wise — mirrors om-portal.js:615-625 exactly.
export function bcaByLocation(bcaCamps: Camp[], history: Record<string, DietitianRateEntry[]>, people: Person[]): BcaLocationRow[] {
  const map: Record<string, BcaLocationRow> = {}
  bcaCamps.forEach((c) => {
    const key = `${c.city || 'UNKNOWN'}|${c.state || ''}`
    if (!map[key]) map[key] = { city: c.city || 'Unknown', state: c.state || '', camps: 0, patientsExpected: 0, patientsDone: 0, transportCost: 0 }
    const person = people.find((p) => p.id === c.dietitianId)
    const exp = dietitianExpense(c, history[c.dietitianId ?? ''] ?? [], person)
    map[key].camps++
    map[key].patientsExpected += Number(c.patientsExpected || 0)
    map[key].patientsDone += Number(c.patientsDone || c.patientCount || 0)
    map[key].transportCost += Number(exp.ta || 0)
  })
  return Object.values(map).sort((a, b) => b.camps - a.camps)
}

export interface RemunerationRow {
  dietitianId: string
  dietitian: string
  camps: number
  base: number
  transport: number
  total: number
}

// Remuneration · BCA Scale transport — mirrors om-portal.js:627-635 exactly.
export function remunerationByDietitian(bcaCamps: Camp[], history: Record<string, DietitianRateEntry[]>, people: Person[]): RemunerationRow[] {
  const map: Record<string, RemunerationRow> = {}
  bcaCamps.forEach((c) => {
    const dId = c.dietitianId || 'UNASSIGNED'
    const person = people.find((p) => p.id === c.dietitianId)
    const dName = person?.name ?? (c.dietitianId ? c.dietitianId : 'Unassigned')
    const exp = dietitianExpense(c, history[c.dietitianId ?? ''] ?? [], person)
    if (!map[dId]) map[dId] = { dietitianId: dId, dietitian: dName, camps: 0, base: 0, transport: 0, total: 0 }
    map[dId].camps++
    map[dId].base += exp.base
    map[dId].transport += exp.ta
    map[dId].total += exp.total
  })
  return Object.values(map).sort((a, b) => b.transport - a.transport)
}

export interface MrRow {
  mrId: string
  mr: string
  pharma: string
  total: number
  pending: number
  closed: number
  cancelled: number
}

// MR-wise camp count — mirrors om-portal.js:637-646 exactly.
export function mrWiseCampCount(dietCamps: Camp[]): MrRow[] {
  const map: Record<string, MrRow> = {}
  dietCamps.forEach((c) => {
    const id = c.mrId || c.mrName || 'UNASSIGNED'
    const name = c.mrName || c.mrId || 'Unassigned MR'
    if (!map[id]) map[id] = { mrId: id, mr: name, pharma: clientName(c.clientId) || '', total: 0, pending: 0, closed: 0, cancelled: 0 }
    map[id].total++
    const s = (c.status ?? '').toUpperCase()
    if (s === 'CLOSED') map[id].closed++
    else if (s.includes('CANCEL')) map[id].cancelled++
    else map[id].pending++
  })
  return Object.values(map).sort((a, b) => b.total - a.total)
}

// ── CSV export — mirrors omCsv() exactly (om-portal.js:722-733) ────────────
export function toCsv<T extends object>(rows: T[]): string {
  if (rows.length === 0) return ''
  const cols = Object.keys(rows[0])
  const enc = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [cols.join(','), ...rows.map((r) => cols.map((c) => enc((r as Record<string, unknown>)[c])).join(','))].join('\n')
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
