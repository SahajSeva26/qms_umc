// Internal persistence primitives shared by the Reminders domain services.
//
// This is the ONE place that knows Reminders data currently lives in
// localStorage. Domain services call load()/persist() and expose
// source-agnostic functions; when the backend lands, only the domain
// services change their bodies to `api.*` calls and this module goes away
// entirely. Mirrors the same pattern already established in
// features/diet/services/dietStorage.ts.
//
// Not exported outside features/reminders/services — components, pages and
// hooks must never import from here.

export const KEYS = {
  THREADS: 'qms.remind.threads',
  TEMPLATES: 'qms.remind.templates',
  CONFIG: 'qms.remind.config',
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

// A failed write means the reminder config/template/thread change was NOT
// saved. This used to be swallowed, so e.g. a settings save or a manual
// trigger's resulting thread update could silently vanish while the UI still
// reported success. Throwing makes the mutation reject, which the calling
// hook/component already surfaces via its own try/catch + toast — this is
// the behaviour a real API already has (a failed POST rejects), so nothing
// here changes when the backend lands. Mirrors features/diet/services/dietStorage.ts.
export function persist<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    const quota = err instanceof DOMException
      && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    throw new StorageWriteError(
      quota
        ? 'Local storage is full — could not save. Clear some browser data and try again.'
        : 'Could not save changes locally.',
      { cause: err },
    )
  }
}
