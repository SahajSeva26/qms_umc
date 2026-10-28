// HQ Mapping & Serviceability domain types — a real Haversine-distance geo
// engine + 4-tier serviceability classifier, port of the prototype's
// hq-serviceability.js (the single most complex file in the whole app,
// 2030 lines) + hq-mapping.js (822 lines, Company→Division→HQ drill-down +
// expansion recommender). Both prototype files share ONE geo engine
// (window.QMS_HQ_GEO) — this file/its sibling hq.service.ts is that same
// single source of truth for this React port, designed to be importable by
// other features later (the prototype's own classifyAll() comment notes
// "used by Client Management" — i.e. more than one screen depends on this
// exact engine in the source app).
// TODO: entirely mock/frontend-only — no backend endpoints exist yet.

export interface CityCoord {
  lat: number
  lng: number
  state: string
}

export type HqPriority = 'HIGH' | 'MED' | 'LOW'
export type BusinessPotential = 'Platinum' | 'Gold' | 'Silver' | 'Bronze'
export type HqSource = 'seed' | 'upload'

// Persisted HQ master record — fields only, no computed classification here
// (classification is always recomputed live, never persisted, matching the
// prototype's classifyHq()/classifyAll() being pure derivations).
export interface HqRecord {
  id: string
  company: string
  division: string
  hqCode: string
  hqName: string
  state: string
  district: string
  city: string
  pincode: string
  lat?: number
  lng?: number
  priority: HqPriority
  businessPotential: BusinessPotential
  requiredDevice: string
  campsPerMonth: number
  createdAt: string
  source: HqSource
  /** Only ever set to 'gazetteer' once classifyHq() auto-resolves blank
   * lat/lng via the city gazetteer — never any other value. */
  geoSource?: 'gazetteer'
}

export type HqTier = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED'

export interface NearestFoRef {
  id: string
  name: string
  hq: string
  state: string
  phone: string
  devices: string[]
  loadPct: number
  km: number
}

export interface SecondFoRef {
  id: string
  name: string
  hq: string
  km: number
}

// Computed classification, always freshly derived by classifyHq() — never
// persisted onto HqRecord itself (matches the prototype's shallow-clone
// return: Object.assign({}, hq, {...computed fields})).
export interface ClassifiedHq extends HqRecord {
  status: HqTier
  reason: string
  distanceKm: number | null
  etaMin: number | null
  deviceMatch: boolean
  deviceLoadPct: number
  deviceAvailable?: string | null
  nearestFo: NearestFoRef | null
  secondFo: SecondFoRef | null
  lastUpdated: string
}

// Normalized FO/dietitian shape used only by the geo engine — a derived view
// over Person, not a separate roster (activeFos() in the prototype).
// lat/lng are optional — a Field Officer whose `hq` city can't be geocoded
// (not in the 90-city gazetteer, no explicit Person.lat/lng) still shows up
// here with no coordinates, exactly like the prototype's activeFos(): excluded
// only from nearest-FO ranking/GREEN-eligibility, never from headcount/KPI
// counts or FO Master listings. Do not filter these out of activeFos()'s
// return value — see classifyHq()/nearestFoWithDevice() for where the
// no-coords case is actually handled (skipped from ranking, not hidden).
export interface GeoFo {
  id: string
  name: string
  hq: string
  state: string
  lat?: number
  lng?: number
  phone: string
  machineIds: string[]
  deviceTypes: string[]
  dailyCap: number
  loadToday: number
  loadPct: number
  active: boolean
  feedbackAvg: number
}

export interface HqGeoConfig {
  radiusKm: number
  extendedKm: number
  avgKmh: number
  deviceLoadPct: number
  earthKmRadius: number
}

export const DEFAULT_HQ_CONFIG: HqGeoConfig = {
  radiusKm: 35,
  extendedKm: 50,
  avgKmh: 35,
  deviceLoadPct: 80,
  earthKmRadius: 6371,
}

export interface NearestFoWithDevice {
  fo: GeoFo
  km: number
  etaMin: number
}

// classifyCity()'s own 3-tier result (GREEN/ORANGE/RED — deliberately NO
// YELLOW, and no loadPct/overload concept at all) — a genuinely distinct,
// thinner classifier used only by the Mapping drill-down's guided flow and
// the bulk city-check, NOT the same function as classifyHq(). Do not unify.
export type CityTier = 'GREEN' | 'ORANGE' | 'RED'

export interface ClassifiedCity {
  city: string
  serviceable: boolean
  status: CityTier
  reason: string
  coord?: CityCoord
  nearestDeviceFo: (NearestFoWithDevice & { fo: GeoFo }) | null
  nearestAnyFo: (NearestFoWithDevice & { fo: GeoFo }) | null
}

// Bulk city-check's own THIRD status vocabulary (SERVICEABLE/NON-SERVICEABLE/
// UNKNOWN CITY) — again deliberately distinct, not unified with HqTier/CityTier.
export type BulkCityStatus = 'SERVICEABLE' | 'NON-SERVICEABLE' | 'UNKNOWN CITY'

export interface BulkCityRow {
  city: string
  status: BulkCityStatus
  servingFo: string
  servingKm: number | null
  nearestCity: string
  nearestKm: number | null
}

export interface BulkTestResult {
  rows: BulkCityRow[]
  serviceable: number
  nonServiceable: number
}

export type ExpansionType = 'fo' | 'diet' | 'both'

export interface ExpansionRecommendation {
  city: string
  type: ExpansionType
  score: number
  executed: number
  upcoming: number
  requested: number
  mrDensity: number
  dietCamps: number
  foHere: boolean
  nearestFo: NearestFoWithDevice | null
  avgLoad: number
  why: string
}
