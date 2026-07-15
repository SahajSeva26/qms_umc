import type { Camp, CampType } from '@/types/camp.types'
import type { UserRole } from '@/types/auth.types'
import { ASSIGNMENTS } from '@/types/salesdash.types'

// Mirrors the prototype's camp-report.js exactly: a role-scoped Camp Report
// (Diet & Screening) segment on the Dashboard. super_admin/admin/sales_lead
// see all clients; sales_rep (KAM) sees only their assigned clients.
// TODO: our AuthUser has no direct link to a people/rep id yet (same gap
// flagged elsewhere this session), so a sales_rep always falls back to "all
// accounts" here rather than a real per-rep subset — there's no live data to
// scope by until that mapping exists.

export const CAMP_REPORT_ROLES: UserRole[] = ['super_admin', 'admin', 'sales_lead', 'sales_rep']

export function canViewCampReport(role: UserRole | undefined): boolean {
  return !!role && CAMP_REPORT_ROLES.includes(role)
}

export type CampReportType = 'ALL' | CampType
export type CampReportView = 'month' | 'day'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function scopedClientIds(role: UserRole | undefined, repId?: string): Set<string> | null {
  if (role !== 'sales_rep' || !repId) return null
  const ids = ASSIGNMENTS.filter((a) => a.repId === repId).map((a) => a.clientId)
  return ids.length ? new Set(ids) : null
}

function typeMatch(type: CampType, filter: CampReportType): boolean {
  return filter === 'ALL' || type === filter
}

interface MonthBucket {
  Diet: number
  Screening: number
}

export interface CampReportData {
  monthly: MonthBucket[]
  perDay: MonthBucket[]
  curM: number
  daysInCurM: number
  dayElapsed: number
  avg3: (type: 'Diet' | 'Screening') => number
  tot: (bucket: MonthBucket) => number
  kpis: {
    curMonthActual: number
    curMonthProjected: number
    lastMonth: number
    nextMonthProj: number
    ytd: number
    yearProj: number
  }
}

export function buildCampReport(camps: Camp[], filter: CampReportType, clientIds: Set<string> | null): CampReportData {
  const scoped = camps.filter((c) => (!clientIds || clientIds.has(c.clientId)) && (c.type === 'Diet' || c.type === 'Screening') && typeMatch(c.type, filter))

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const year = today.getFullYear()
  const curM = today.getMonth()
  const daysInCurM = new Date(year, curM + 1, 0).getDate()
  const dayElapsed = today.getDate()

  const monthly: MonthBucket[] = MONTHS.map(() => ({ Diet: 0, Screening: 0 }))
  const perDay: MonthBucket[] = Array.from({ length: daysInCurM + 1 }, () => ({ Diet: 0, Screening: 0 }))

  for (const c of scoped) {
    const d = new Date(c.date)
    if (d.getFullYear() !== year) continue
    const m = d.getMonth()
    monthly[m][c.type as 'Diet' | 'Screening']++
    if (m === curM) perDay[d.getDate()][c.type as 'Diet' | 'Screening']++
  }

  function avg3(type: 'Diet' | 'Screening'): number {
    let sum = 0
    let n = 0
    for (let m = curM - 1; m >= 0 && n < 3; m--) {
      sum += monthly[m][type]
      n++
    }
    return n ? sum / n : (monthly[curM][type] / Math.max(1, dayElapsed)) * daysInCurM
  }

  function tot(bucket: MonthBucket): number {
    return filter === 'ALL' ? bucket.Diet + bucket.Screening : bucket[filter as 'Diet' | 'Screening']
  }

  function projType(fn: (type: 'Diet' | 'Screening') => number): number {
    return filter === 'ALL' ? fn('Diet') + fn('Screening') : fn(filter as 'Diet' | 'Screening')
  }

  const curMonthActual = tot(monthly[curM])
  const curMonthProjected = Math.round((curMonthActual / Math.max(1, dayElapsed)) * daysInCurM)
  const lastMonth = curM > 0 ? tot(monthly[curM - 1]) : 0
  const nextMonthProj = Math.round(projType(avg3))
  const ytd = monthly.slice(0, curM + 1).reduce((a, o) => a + tot(o), 0)
  const remainingFullMonths = 11 - curM
  const yearProj = ytd - curMonthActual + curMonthProjected + Math.round(projType(avg3)) * remainingFullMonths

  return {
    monthly,
    perDay,
    curM,
    daysInCurM,
    dayElapsed,
    avg3,
    tot,
    kpis: { curMonthActual, curMonthProjected, lastMonth, nextMonthProj, ytd, yearProj },
  }
}

export { MONTHS }
