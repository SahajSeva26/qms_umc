import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createQuickSwitchTransferFragment,
  setCachedQuickSwitchAccounts,
} from '@qms/core'
import { ingestQuickSwitchTransfer } from './quickSwitch.transfer'

vi.mock('@qms/core', async () => {
  const actual = await vi.importActual<typeof import('@qms/core')>('@qms/core')
  return { ...actual, setCachedQuickSwitchAccounts: vi.fn() }
})

describe('ingestQuickSwitchTransfer', () => {
  beforeEach(() => vi.clearAllMocks())

  it('stores the transferred catalogue on the pharma origin and removes it from the URL', () => {
    const accounts = [
      { label: 'MR — Amit', email: 'mr1@demo.qms.in', password: 'Test@123' },
      { label: 'ASM — Neha', email: 'asm@demo.qms.in', password: 'Test@123' },
    ]
    const fragment = createQuickSwitchTransferFragment(accounts)
    window.history.replaceState(null, '', `/pharma/mr?view=dashboard#${fragment}`)

    ingestQuickSwitchTransfer()

    expect(setCachedQuickSwitchAccounts).toHaveBeenCalledWith(accounts)
    expect(window.location.pathname).toBe('/pharma/mr')
    expect(window.location.search).toBe('?view=dashboard')
    expect(window.location.hash).toBe('')
  })

  it('does nothing when there is no transfer fragment', () => {
    window.history.replaceState(null, '', '/pharma/mr')
    ingestQuickSwitchTransfer()
    expect(setCachedQuickSwitchAccounts).not.toHaveBeenCalled()
  })
})
