// Filter shape + pure apply/uniq helpers — exact port of hq-serviceability.js's
// STATE.filter + applyFilters()/uniq() (lines 420-466). Distance buckets and
// their thresholds (<10 / 10-35 / 35-50 / >50) are the prototype's own.
import type { ClassifiedHq, HqTier } from '@/features/hq/hq.types'

export interface HqFilters {
  company: string
  state: string
  city: string
  division: string
  status: HqTier | 'ALL'
  deviceType: string
  distance: 'ALL' | '<10' | '10-35' | '35-50' | '>50'
  q: string
}

export const EMPTY_HQ_FILTERS: HqFilters = {
  company: 'ALL', state: 'ALL', city: 'ALL', division: 'ALL', status: 'ALL', deviceType: 'ALL', distance: 'ALL', q: '',
}

export function applyHqFilters(rows: ClassifiedHq[], f: HqFilters): ClassifiedHq[] {
  const q = (f.q || '').trim().toLowerCase()
  return rows.filter((r) => {
    if (f.company !== 'ALL' && r.company !== f.company) return false
    if (f.state !== 'ALL' && r.state !== f.state) return false
    if (f.city !== 'ALL' && r.city !== f.city) return false
    if (f.division !== 'ALL' && r.division !== f.division) return false
    if (f.status !== 'ALL' && r.status !== f.status) return false
    if (f.deviceType !== 'ALL' && r.requiredDevice !== f.deviceType) return false
    if (f.distance !== 'ALL') {
      const km = r.distanceKm == null ? Infinity : r.distanceKm
      if (f.distance === '<10' && !(km < 10)) return false
      if (f.distance === '10-35' && !(km >= 10 && km <= 35)) return false
      if (f.distance === '35-50' && !(km > 35 && km <= 50)) return false
      if (f.distance === '>50' && !(km > 50)) return false
    }
    if (q) {
      const blob = `${r.company} ${r.hqName} ${r.hqCode} ${r.city} ${r.division} ${r.nearestFo?.name ?? ''}`.toLowerCase()
      if (!blob.includes(q)) return false
    }
    return true
  })
}

export function uniqSorted(values: (string | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v))).sort()
}
