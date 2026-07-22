// HQ Mapping & Serviceability — the geo/serviceability engine. Exact port of
// hq-serviceability.js's window.QMS_HQ_GEO public API (Haversine, the
// 4-tier classifyHq/classifyAll engine, activeFos(), nearestFoWithDevice)
// plus hq-mapping.js's own classifyCity() (a DELIBERATELY DIFFERENT, thinner
// 3-tier classifier — do not unify with classifyHq, see hq.types.ts).
// Designed as a standalone module (pure functions + local storage), matching
// the prototype's own note that classifyAll() is "used by Client Management"
// — i.e. more than one screen may eventually depend on this exact contract.
// TODO: entirely mock/frontend-only — no backend endpoints exist yet.

import type { Person } from '@/types/people.types'
import type { Camp } from '@/types/camp.types'
import type { DeviceCatalogItem } from '@/types/device.types'
import { lookupCity, CITY_COORDS } from '@/features/hq/cityGazetteer'
import type {
  HqRecord, ClassifiedHq, GeoFo, HqGeoConfig, NearestFoWithDevice,
  ClassifiedCity, BulkCityRow, BulkTestResult, ExpansionRecommendation,
} from '@/features/hq/hq.types'
import { DEFAULT_HQ_CONFIG } from '@/features/hq/hq.types'
import { SEED_HQS } from '@/features/hq/hq.mock'

const KEYS = {
  HQS: 'qms.hq.master',
  CONFIG: 'qms.hq.config',
}

function load<T>(key: string, seed: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch {
    // fall through to seed
  }
  return JSON.parse(JSON.stringify(seed))
}

function persist<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // demo persistence only
  }
}

function nowIso() {
  return new Date().toISOString()
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

// ── Config — 5 thresholds, override mechanism exists but (per the
// prototype) has zero UI call sites; kept for parity/future use. ──────────

export function getConfig(): HqGeoConfig {
  return { ...DEFAULT_HQ_CONFIG, ...load(KEYS.CONFIG, {} as Partial<HqGeoConfig>) }
}

export function saveConfig(patch: Partial<HqGeoConfig>): HqGeoConfig {
  const next = { ...getConfig(), ...patch }
  persist(KEYS.CONFIG, next)
  return next
}

// ── Haversine ──────────────────────────────────────────────────────────

function toRad(d: number): number {
  return (d * Math.PI) / 180
}

export function haversine(a: { lat?: number; lng?: number } | undefined | null, b: { lat?: number; lng?: number } | undefined | null): number {
  if (!a || !b || typeof a.lat !== 'number' || typeof b.lat !== 'number' || typeof a.lng !== 'number' || typeof b.lng !== 'number') return Infinity
  const R = getConfig().earthKmRadius
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const A = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(A))
}

export function etaMinutes(km: number): number {
  return Math.round((km / getConfig().avgKmh) * 60)
}

// ── HQ master store ────────────────────────────────────────────────────

export function loadHqs(): HqRecord[] {
  return load(KEYS.HQS, SEED_HQS)
}

export function saveHqs(list: HqRecord[]): void {
  persist(KEYS.HQS, list)
}

// ── activeFos() — normalized FO view for the geo engine ─────────────────
// people().filter(role==='Field Officer' && !relievedOn), auto-geocoded via
// lookupCity(hq) once, enriched with today's load%. Exact port of
// hq-serviceability.js:239-263 — every active FO is returned regardless of
// whether coordinates resolve; a FO whose HQ city isn't in the gazetteer (and
// has no explicit Person.lat/lng) still appears here with lat/lng undefined,
// so FO Master/KPI counts/load-distribution stay accurate. Only the ranking
// steps inside classifyHq()/nearestFoWithDevice() skip no-coords FOs.

export function activeFos(people: Person[], camps: Camp[], devices: DeviceCatalogItem[]): GeoFo[] {
  const today = todayIso()
  return people
    .filter((p) => p.role === 'Field Officer' && !p.relievedOn)
    .map((p) => {
      let lat = p.lat
      let lng = p.lng
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        const c = lookupCity(p.hq)
        if (c) { lat = c.lat; lng = c.lng }
      }
      const machineIds = p.machinesAssigned ?? []
      const deviceTypes = machineIds
        .map((id) => devices.find((d) => d.id === id)?.type)
        .filter((t): t is string => !!t)
      const dailyCap = p.campsPerDay || 2
      const loadToday = camps.filter((c) => c.foId === p.id && c.date?.slice(0, 10) === today && !String(c.status || '').startsWith('CANCEL')).length
      return {
        id: p.id,
        name: p.name,
        hq: p.hq || '—',
        state: p.states?.[0] || '',
        lat, lng,
        phone: p.phone,
        machineIds, deviceTypes,
        dailyCap,
        loadToday,
        loadPct: Math.round((loadToday / dailyCap) * 100),
        active: true,
        feedbackAvg: p.feedbackAvg || 0,
      }
    })
}

// ── classifyHq() — the 4-tier engine, exact port of hq-serviceability.js:336-404 ──

export function classifyHq(hq: HqRecord, fos: GeoFo[]): ClassifiedHq {
  const cfg = getConfig()
  let lat = hq.lat
  let lng = hq.lng
  let geoSource = hq.geoSource
  if (!lat || !lng) {
    const c = lookupCity(hq.city) || lookupCity(hq.hqName)
    if (c) { lat = c.lat; lng = c.lng; geoSource = 'gazetteer' }
  }
  if (!lat || !lng) {
    return {
      ...hq, status: 'RED', distanceKm: null, nearestFo: null, secondFo: null, etaMin: null,
      deviceMatch: false, deviceLoadPct: 0, lastUpdated: nowIso(), reason: 'No coordinates',
    }
  }
  const hqPoint = { lat, lng }
  const ranked = fos
    .filter((f) => f.active && typeof f.lat === 'number' && typeof f.lng === 'number')
    .map((f) => {
      const km = haversine(hqPoint, f)
      const deviceMatch = !hq.requiredDevice || f.deviceTypes.some((t) => String(t).toLowerCase().includes(String(hq.requiredDevice).toLowerCase()))
      return { fo: f, km, deviceMatch }
    })
    .sort((a, b) => {
      const closest = Math.min(a.km, b.km)
      const aBonus = a.deviceMatch && a.km - closest < 5 ? -2 : 0
      const bBonus = b.deviceMatch && b.km - closest < 5 ? -2 : 0
      return (a.km + aBonus) - (b.km + bBonus)
    })
  const top = ranked[0]
  const second = ranked[1]
  if (!top) {
    return {
      ...hq, lat, lng, geoSource, status: 'RED', distanceKm: null, nearestFo: null, secondFo: null, etaMin: null,
      deviceMatch: false, deviceLoadPct: 0, lastUpdated: nowIso(), reason: 'No active FOs in master',
    }
  }
  let status: ClassifiedHq['status'] = 'RED'
  let reason = ''
  if (top.km <= cfg.radiusKm) {
    if (top.deviceMatch && top.fo.loadPct < cfg.deviceLoadPct) {
      status = 'GREEN'; reason = 'FO + matching device within 35 KM'
    } else if (top.deviceMatch && top.fo.loadPct >= cfg.deviceLoadPct) {
      status = 'YELLOW'; reason = `FO available but device overloaded (${top.fo.loadPct}%)`
    } else {
      status = 'YELLOW'; reason = 'FO nearby but no matching device'
    }
  } else if (top.km <= cfg.extendedKm) {
    status = 'ORANGE'; reason = `FO is ${top.km.toFixed(1)} KM away — beyond 35 KM target`
  } else {
    status = 'RED'; reason = `No FO within ${cfg.extendedKm} KM`
  }
  return {
    ...hq, lat, lng, geoSource,
    status, reason,
    distanceKm: top.km,
    etaMin: etaMinutes(top.km),
    deviceMatch: top.deviceMatch,
    deviceLoadPct: top.fo.loadPct,
    deviceAvailable: top.deviceMatch
      ? (top.fo.deviceTypes.find((t) => String(t).toLowerCase().includes(String(hq.requiredDevice || '').toLowerCase())) ?? top.fo.deviceTypes[0] ?? null)
      : null,
    nearestFo: {
      id: top.fo.id, name: top.fo.name, hq: top.fo.hq, state: top.fo.state,
      phone: top.fo.phone, devices: top.fo.deviceTypes, loadPct: top.fo.loadPct,
      km: +top.km.toFixed(2),
    },
    secondFo: second ? { id: second.fo.id, name: second.fo.name, hq: second.fo.hq, km: +second.km.toFixed(2) } : null,
    lastUpdated: nowIso(),
  }
}

// classifyAll() — no time-based cache in the React port (unlike the
// prototype's 4s-TTL CACHE keyed only on Date.now(); React Query / component
// memoization already handles recomputation cost at this data scale ~90-300
// rows, so the invalidation-discipline problem the prototype's cache created
// doesn't apply here — every call is fresh).
export function classifyAll(people: Person[], camps: Camp[], devices: DeviceCatalogItem[]): ClassifiedHq[] {
  const fos = activeFos(people, camps, devices)
  return loadHqs().map((h) => classifyHq(h, fos))
}

// ── nearestFoWithDevice() — hard device-type filter (unlike classifyHq's
// soft preference-bonus), used by classifyCity/expansion/machine-replacement. ──

export function nearestFoWithDevice(originCity: string, deviceType: string | null, fos: GeoFo[]): NearestFoWithDevice | null {
  const coord = lookupCity(originCity)
  if (!coord) return null
  const candidates = fos.filter((f) => {
    if (!f.active || typeof f.lat !== 'number' || typeof f.lng !== 'number') return false
    if (deviceType) return f.deviceTypes.some((t) => String(t).toLowerCase().includes(deviceType.toLowerCase()))
    return true
  })
  if (!candidates.length) return null
  let best: GeoFo | null = null
  let bestKm = Infinity
  for (const f of candidates) {
    const km = haversine(coord, f)
    if (km < bestKm) { bestKm = km; best = f }
  }
  if (!best) return null
  return { fo: best, km: +bestKm.toFixed(2), etaMin: etaMinutes(bestKm) }
}

// ── classifyCity() — hq-mapping.js's own 3-tier (GREEN/ORANGE/RED, no
// YELLOW, no loadPct concept) wrapper, built purely on the primitives above. ──

export function classifyCity(city: string, deviceType: string | null, fos: GeoFo[]): ClassifiedCity {
  const coord = lookupCity(city)
  if (!coord) {
    return { city, serviceable: false, status: 'RED', reason: 'unknown city (no coordinates)', nearestDeviceFo: null, nearestAnyFo: null }
  }
  const cfg = getConfig()
  const withDev = nearestFoWithDevice(city, deviceType, fos)
  const anyFo = nearestFoWithDevice(city, null, fos)
  let serviceable = false
  let status: ClassifiedCity['status'] = 'RED'
  let reason = ''
  if (withDev && withDev.km <= cfg.radiusKm) {
    serviceable = true; status = 'GREEN'
    reason = `${withDev.fo.name} (${withDev.fo.hq}) · ${withDev.km} KM with ${deviceType || 'device'}`
  } else if (withDev && withDev.km <= cfg.extendedKm) {
    status = 'ORANGE'
    reason = `Nearest device-FO ${withDev.fo.name} is ${withDev.km} KM (beyond ${cfg.radiusKm} KM target)`
  } else {
    status = 'RED'
    reason = withDev ? `Nearest device-FO ${withDev.km} KM away` : `No FO with ${deviceType || 'device'} in range`
  }
  return {
    city, serviceable, status, reason, coord,
    nearestDeviceFo: withDev ? { ...withDev, fo: withDev.fo } : null,
    nearestAnyFo: anyFo ? { ...anyFo, fo: anyFo.fo } : null,
  }
}

// ── Bulk city-serviceability check ────────────────────────────────────

const DEFAULT_TESTS = ['BP', 'Glucometer', 'ECG', 'SpO2', 'BMI', 'Lipid']

export function bulkTestUniverse(fos: GeoFo[]): string[] {
  const set = new Set<string>()
  fos.forEach((f) => f.deviceTypes.forEach((t) => set.add(t)))
  return set.size ? Array.from(set) : DEFAULT_TESTS
}

// cityServiceable() — exact-array-membership device match (NOT the substring
// match classifyHq/nearestFoWithDevice use) — a deliberately different rule
// specific to the bulk checker, per hq-serviceability.js.
function cityServiceable(coord: { lat: number; lng: number }, test: string, fos: GeoFo[]): { fo: GeoFo; km: number } | null {
  const cfg = getConfig()
  let best: { fo: GeoFo; km: number } | null = null
  for (const f of fos) {
    if (!f.active || typeof f.lat !== 'number' || typeof f.lng !== 'number') continue
    if (!f.deviceTypes.includes(test)) continue
    const km = haversine(coord, f)
    if (km <= cfg.radiusKm && (!best || km < best.km)) best = { fo: f, km }
  }
  return best
}

function nearestServiceableCity(coord: { lat: number; lng: number }, test: string, fos: GeoFo[]): { city: string; km: number } | null {
  let best: { city: string; km: number } | null = null
  for (const [cityName, cityCoord] of Object.entries(CITY_COORDS)) {
    const match = cityServiceable(cityCoord, test, fos)
    if (!match) continue
    const km = haversine(coord, cityCoord)
    if (km === Infinity) continue
    if (!best || km < best.km) best = { city: cityName, km }
  }
  return best
}

export function computeBulk(cities: string[], tests: string[], fos: GeoFo[]): Record<string, BulkTestResult> {
  const out: Record<string, BulkTestResult> = {}
  for (const test of tests) {
    const rows: BulkCityRow[] = cities.map((cityName) => {
      const coord = lookupCity(cityName)
      if (!coord) return { city: cityName, status: 'UNKNOWN CITY', servingFo: '', servingKm: null, nearestCity: '', nearestKm: null }
      const match = cityServiceable(coord, test, fos)
      if (match) {
        return {
          city: cityName, status: 'SERVICEABLE',
          servingFo: `${match.fo.name} (${match.fo.hq})`, servingKm: Math.round(match.km),
          nearestCity: '', nearestKm: null,
        }
      }
      const nearest = nearestServiceableCity(coord, test, fos)
      return {
        city: cityName, status: 'NON-SERVICEABLE', servingFo: '', servingKm: null,
        nearestCity: nearest?.city ?? '', nearestKm: nearest ? Math.round(nearest.km) : null,
      }
    })
    out[test] = {
      rows,
      serviceable: rows.filter((r) => r.status === 'SERVICEABLE').length,
      nonServiceable: rows.filter((r) => r.status !== 'SERVICEABLE').length,
    }
  }
  return out
}

// ── Expansion recommender — buildExpansion(), exact scoring formula ─────
// (hq-mapping.js:682-756). Lives here (not a separate hqMapping.service.ts)
// since it only needs camps/people/MR data + the primitives above — kept
// alongside the rest of the engine per the "one geo module" design intent.

export interface MrLike {
  hq: string
  serviceability?: { screening?: { cities?: string[] }; diet?: { cities?: string[] }; lab?: { cities?: string[] } }
}

export function buildExpansion(camps: Camp[], mrs: MrLike[], fos: GeoFo[]): ExpansionRecommendation[] {
  const cfg = getConfig()
  const today = todayIso()
  const candidateCities = new Set<string>()
  const add = (name?: string) => {
    if (name && lookupCity(name)) candidateCities.add(name)
  }
  camps.forEach((c) => add(c.city))
  mrs.forEach((m) => {
    add(m.hq)
    ;[m.serviceability?.screening?.cities, m.serviceability?.diet?.cities, m.serviceability?.lab?.cities]
      .forEach((arr) => (arr ?? []).forEach(add))
  })
  Object.keys(CITY_COORDS).forEach(add)

  const out: ExpansionRecommendation[] = []
  candidateCities.forEach((key) => {
    const cityLower = key.toLowerCase()
    const cityCamps = camps.filter((c) => (c.city || '').toLowerCase() === cityLower)
    const executed = cityCamps.filter((c) => c.status === 'CLOSED').length
    const upcoming = cityCamps.filter((c) => (c.date?.slice(0, 10) ?? '') >= today && !String(c.status || '').startsWith('CANCEL') && c.status !== 'CLOSED').length
    const requested = cityCamps.filter((c) => c.status === 'REQUESTED').length
    const dietCamps = cityCamps.filter((c) => /diet/i.test(c.type)).length
    const mrHere = mrs.filter((m) => (m.hq || '').toLowerCase() === cityLower).length
    const mrCovering = mrs.filter((m) =>
      [m.serviceability?.screening?.cities, m.serviceability?.diet?.cities, m.serviceability?.lab?.cities]
        .some((arr) => (arr ?? []).some((c) => c.toLowerCase() === cityLower))
    ).length
    const mrDensity = mrHere + mrCovering
    const foHere = fos.some((f) => (f.hq || '').toLowerCase() === cityLower)
    const nearestFo = nearestFoWithDevice(key, null, fos)
    const nearFos = fos.filter((f) => typeof f.lat === 'number' && typeof f.lng === 'number' && haversine(lookupCity(key) ?? { lat: 0, lng: 0 }, f) <= cfg.extendedKm)
    const avgLoad = nearFos.length ? Math.round(nearFos.reduce((s, f) => s + f.loadPct, 0) / nearFos.length) : 0

    const demand = executed * 2 + upcoming * 2 + requested * 3 + mrDensity * 1.5 + dietCamps * 1.5
    if (demand < 3) return

    let gap = 0
    if (!foHere) gap += 3
    if (nearestFo == null) gap += 6
    else if (nearestFo.km > cfg.extendedKm) gap += 5
    else if (nearestFo.km > cfg.radiusKm) gap += 3
    if (avgLoad >= (cfg.deviceLoadPct || 80)) gap += 3
    if (gap === 0) return

    const score = Math.round(demand + gap * 4)
    const needDiet = dietCamps >= 1 || mrs.some((m) => (m.hq || '').toLowerCase() === cityLower && JSON.stringify(m.serviceability ?? {}).match(/diet/i))
    const needFo = true
    const type: ExpansionRecommendation['type'] = needDiet && needFo ? (dietCamps > executed ? 'diet' : 'both') : (needDiet ? 'diet' : 'fo')

    const parts: string[] = []
    if (executed) parts.push(`${executed} camps executed here`)
    if (upcoming) parts.push(`${upcoming} upcoming`)
    if (requested) parts.push(`${requested} open request(s)`)
    if (mrDensity) parts.push(`${mrDensity} MR(s) cover this market`)
    if (dietCamps) parts.push(`${dietCamps} diet camp(s)`)
    let why = parts.length ? parts.join(', ') : 'emerging'
    if (foHere) why += '. An FO is already based here.'
    else if (!nearestFo) why += '. No FO anywhere near.'
    else why += `. Nearest FO is ${nearestFo.fo.name} in ${nearestFo.fo.hq}, ${nearestFo.km} KM away.`
    if (avgLoad >= (cfg.deviceLoadPct || 80)) why += ` Nearby FOs run hot at ${avgLoad}% load.`

    out.push({ city: key, type, score, executed, upcoming, requested, mrDensity, dietCamps, foHere, nearestFo, avgLoad, why })
  })

  return out.sort((a, b) => b.score - a.score).slice(0, 24)
}
