import { beforeEach, describe, expect, it } from 'vitest'
import {
  createQuickSwitchTransferFragment,
  getCachedQuickSwitchAccounts,
  readQuickSwitchTransferFragment,
  setCachedQuickSwitchAccounts,
} from './quickSwitch.cache'

describe('quick-switch account cache', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips the shared demo-account list used by both frontend builds', () => {
    const accounts = [{ label: 'MR — Amit', email: 'mr1@demo.qms.in', password: 'Test@123' }]
    setCachedQuickSwitchAccounts(accounts)
    expect(getCachedQuickSwitchAccounts()).toEqual(accounts)
  })

  it('fails closed for malformed cached data', () => {
    localStorage.setItem('qms.dev.quickSwitchAccounts', JSON.stringify([{ email: 'missing-fields@example.com' }]))
    expect(getCachedQuickSwitchAccounts()).toBeNull()
  })

  it('transfers labels and emails through a URL fragment without exposing the demo password', () => {
    const accounts = [{ label: 'MR — Amit', email: 'mr1@demo.qms.in', password: 'Test@123' }]
    const fragment = createQuickSwitchTransferFragment(accounts)

    expect(fragment).not.toContain('Test%40123')
    expect(fragment).not.toContain('Test@123')
    expect(readQuickSwitchTransferFragment(`#${fragment}`)).toEqual(accounts)
  })
})
