// Dev-only browser cache shared by both frontend builds. Production code can import this module,
// but neither app mounts its quick-switch UI outside import.meta.env.DEV.
export interface QuickSwitchAccount {
  label: string
  email: string
  // seedQmsDemo.ts uses the same fixed password for its demo accounts.
  password: string
}

const STORAGE_KEY = 'qms.dev.quickSwitchAccounts'
const TRANSFER_KEY = 'qmsQuickSwitch'
export const DEMO_QUICK_SWITCH_PASSWORD = 'Test@123'

function isQuickSwitchAccount(value: unknown): value is QuickSwitchAccount {
  if (!value || typeof value !== 'object') return false
  const account = value as Record<string, unknown>
  return typeof account.label === 'string'
    && typeof account.email === 'string'
    && typeof account.password === 'string'
}

export function getCachedQuickSwitchAccounts(): QuickSwitchAccount[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.every(isQuickSwitchAccount) ? parsed : null
  } catch {
    return null
  }
}

export function setCachedQuickSwitchAccounts(accounts: QuickSwitchAccount[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
  } catch {
    // Storage may be unavailable (private mode/quota). The internal switcher can fetch again;
    // pharma still exposes its fixed system-account escape hatch.
  }
}

/**
 * Carries only the non-secret demo-account catalogue between split dev origins. The fixed demo
 * password already ships in dev tooling and is reconstructed by the receiving app; it is never
 * written into the URL. A fragment is used so the catalogue is not sent to the web server,
 * reverse proxy, access logs, or referrer headers.
 */
export function createQuickSwitchTransferFragment(accounts: QuickSwitchAccount[]): string | null {
  if (accounts.length === 0) return null
  const payload = accounts.map(({ label, email }) => ({ label, email }))
  return new URLSearchParams({ [TRANSFER_KEY]: JSON.stringify(payload) }).toString()
}

export function readQuickSwitchTransferFragment(fragment: string): QuickSwitchAccount[] | null {
  try {
    const params = new URLSearchParams(fragment.replace(/^#/, ''))
    const raw = params.get(TRANSFER_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null

    const accounts = parsed.map((value): QuickSwitchAccount | null => {
      if (!value || typeof value !== 'object') return null
      const record = value as Record<string, unknown>
      if (typeof record.label !== 'string' || typeof record.email !== 'string') return null
      return {
        label: record.label,
        email: record.email,
        password: DEMO_QUICK_SWITCH_PASSWORD,
      }
    })
    return accounts.every((account): account is QuickSwitchAccount => account !== null)
      ? accounts
      : null
  } catch {
    return null
  }
}
