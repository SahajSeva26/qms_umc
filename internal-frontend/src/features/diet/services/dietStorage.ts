// Internal persistence primitives shared by the Diet domain services.
//
// This is the ONE place that knows data currently lives in localStorage.
// Domain services call load()/persist() and expose async, source-agnostic
// functions; when the backend lands, only the domain services change their
// bodies to `api.get(...)` and this module goes away entirely.
//
// Used by the Diet domain services and by diet.service.ts (the Diet-Camps
// service at the feature root, which keeps its own KEYS but shares these
// primitives). Components, pages and hooks must never import from here.

export const KEYS = {
  ENROLL: 'qms.om.dietEnroll',
  DETAILS: 'qms.om.dietDetails',
  RATE_HISTORY: 'qms.diet.rateHistory',
  INVITES: 'qms.diet.invites',
  EQUIPMENT: 'qms.diet.equipment',
  FEEDBACK: 'qms.diet.feedback',
  PAYMENTS: 'qms.diet.payments',
}

export function load<T>(key: string, seed: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch {
    // fall through to seed
  }
  return JSON.parse(JSON.stringify(seed))
}

export class StorageWriteError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'StorageWriteError'
  }
}

// A failed write means the user's data was NOT saved. This used to be
// swallowed, so a quota-exceeded save (an oversized cheque image is the real
// case — see dietitianDocuments.service.ts) still showed a success toast while
// silently discarding the write AND every other record sharing that key.
//
// Throwing makes the mutation reject, which the calling hook surfaces. This is
// the behaviour a real API already has — a failed POST rejects — so nothing
// here changes when the backend lands.
export function persist<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    const quota = err instanceof DOMException
      && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    throw new StorageWriteError(
      quota
        ? 'Local storage is full — could not save. Remove a large attachment and try again.'
        : 'Could not save changes locally.',
      { cause: err },
    )
  }
}

export function arr<T>(v: T[] | undefined | null): T[] {
  return Array.isArray(v) ? v : []
}

export function num(...candidates: (number | undefined | null)[]): number {
  for (const c of candidates) {
    if (typeof c === 'number' && isFinite(c)) return c
  }
  return 0
}

// Deterministic PRNG keyed by a string seed — exact port of om-data.js's
// seeded()/FNV-1a-ish hash, used so "random" travel/base-rate fallbacks are
// stable across renders for the same camp id.
export function seeded(str: string): () => number {
  let s = 2166136261 >>> 0
  const input = String(str || 'x')
  for (let i = 0; i < input.length; i++) {
    s ^= input.charCodeAt(i)
    s = Math.imul(s, 16777619) >>> 0
  }
  return function () {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}
