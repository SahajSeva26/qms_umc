import {
  readQuickSwitchTransferFragment,
  setCachedQuickSwitchAccounts,
} from '@qms/core'

/** Ingests the internal app's dev-only role catalogue before React Router can replace the hash. */
export function ingestQuickSwitchTransfer(): void {
  const accounts = readQuickSwitchTransferFragment(window.location.hash)
  if (!accounts) return

  setCachedQuickSwitchAccounts(accounts)

  // Remove the one-time catalogue immediately. It has served its purpose and should not remain in
  // copied URLs or browser history. The fragment is dedicated to this transfer in dev mode.
  const cleanUrl = `${window.location.pathname}${window.location.search}`
  window.history.replaceState(window.history.state, '', cleanUrl)
}
