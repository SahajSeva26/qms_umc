// Dev-only. Client-side cache for QuickSwitchPopup's role→account list, so the list only ever
// needs to be fetched once (while logged in as an admin-ish role that holds role:search), then
// every later switch — in any direction, from any role — reads the cache instead of needing
// another privileged GET /roles call (which would 403 for most roles).

export interface QuickSwitchAccount {
  label: string
  email: string
  // The seed script (seedQmsDemo.ts) uses this same password for every demo account; this is the
  // one fixed assumption the cache relies on, since a hashed password can never be read back.
  password: string
}

const STORAGE_KEY = 'qms.dev.quickSwitchAccounts'

export function getCachedQuickSwitchAccounts(): QuickSwitchAccount[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function setCachedQuickSwitchAccounts(accounts: QuickSwitchAccount[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
  } catch {
    // Storage unavailable (private mode, quota) — the popup falls back to re-fetching each time.
  }
}
