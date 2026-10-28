import type { CampEntity } from '@/types/campReal.types'

// Month-by-month camp volume + run-rate projection, mirroring the prototype's camp-report.js math
// but applied to real camps (plus a third `lab` type the prototype doesn't have). Expects input
// already filtered to conducted camps only (closed/cancelled_charged) — see useCampMonthlyReport.ts.

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export type CampReportType = 'ALL' | 'screening' | 'diet' | 'lab'
export type CampReportView = 'month' | 'day'

interface MonthBucket {
  screening: number
  diet: number
  lab: number
}

export interface CampMonthlyReport {
  monthly: MonthBucket[]
  perDay: MonthBucket[]
  curM: number
  daysInCurM: number
  dayElapsed: number
  tot: (bucket: MonthBucket, type: CampReportType) => number
  avg3: (type: CampReportType) => number
  kpis: {
    curMonthActual: number
    curMonthProjected: number
    lastMonth: number
    nextMonthProj: number
    ytd: number
    yearProj: number
  }
}

function emptyBucket(): MonthBucket {
  return { screening: 0, diet: 0, lab: 0 }
}

function totOf(bucket: MonthBucket, type: CampReportType): number {
  if (type === 'ALL') return bucket.screening + bucket.diet + bucket.lab
  return bucket[type]
}

export function buildCampMonthlyReport(camps: CampEntity[], type: CampReportType): CampMonthlyReport {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const year = today.getFullYear()
  const curM = today.getMonth()
  const daysInCurM = new Date(year, curM + 1, 0).getDate()
  const dayElapsed = today.getDate()

  const monthly: MonthBucket[] = MONTHS.map(() => emptyBucket())
  const perDay: MonthBucket[] = Array.from({ length: daysInCurM + 1 }, () => emptyBucket())

  for (const camp of camps) {
    if (type !== 'ALL' && camp.type !== type) continue
    const d = new Date(camp.date)
    if (d.getFullYear() !== year) continue
    const m = d.getMonth()
    monthly[m][camp.type]++
    if (m === curM) perDay[d.getDate()][camp.type]++
  }

  const tot = (bucket: MonthBucket, t: CampReportType) => totOf(bucket, t)

  // Run-rate from the last 3 COMPLETE months; falls back to extrapolating the current (partial)
  // month if fewer than 3 prior months exist yet (e.g. a January dashboard view).
  function avg3(t: CampReportType): number {
    let sum = 0
    let n = 0
    for (let m = curM - 1; m >= 0 && n < 3; m--) {
      sum += tot(monthly[m], t)
      n++
    }
    if (n > 0) return sum / n
    return (tot(monthly[curM], t) / Math.max(1, dayElapsed)) * daysInCurM
  }

  const curMonthActual = tot(monthly[curM], type)
  const curMonthProjected = Math.round((curMonthActual / Math.max(1, dayElapsed)) * daysInCurM)
  const lastMonth = curM > 0 ? tot(monthly[curM - 1], type) : 0
  const nextMonthProj = Math.round(avg3(type))
  const ytd = monthly.slice(0, curM + 1).reduce((sum, bucket) => sum + tot(bucket, type), 0)
  const remainingFullMonths = 11 - curM
  const yearProj = ytd - curMonthActual + curMonthProjected + Math.round(avg3(type)) * remainingFullMonths

  return {
    monthly,
    perDay,
    curM,
    daysInCurM,
    dayElapsed,
    tot,
    avg3,
    kpis: { curMonthActual, curMonthProjected, lastMonth, nextMonthProj, ytd, yearProj },
  }
}
