import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getCachedQuickSwitchAccounts } from '@qms/core'
import { internalHref } from '@/config/env'
import { useQuickSwitch } from './useQuickSwitch'
import QuickSwitchPopup from './QuickSwitchPopup'

vi.mock('@qms/core', async () => {
  const actual = await vi.importActual<typeof import('@qms/core')>('@qms/core')
  return { ...actual, getCachedQuickSwitchAccounts: vi.fn() }
})
vi.mock('./useQuickSwitch')

function renderPopup(queryClient = new QueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <QuickSwitchPopup onClose={vi.fn()} />
    </QueryClientProvider>,
  )
}

describe('QuickSwitchPopup — pharma escape path', () => {
  const originalLocation = window.location

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getCachedQuickSwitchAccounts).mockReturnValue(null)
    vi.mocked(useQuickSwitch).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
    } as unknown as ReturnType<typeof useQuickSwitch>)
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', { value: originalLocation, writable: true, configurable: true })
  })

  it('always offers the system account, even when cross-port localStorage has no cached role list', () => {
    renderPopup()

    expect(screen.getByText('System administrator')).toBeInTheDocument()
    expect(screen.getByText('system@gmail.com')).toBeInTheDocument()
  })

  it('offers every account cached by the internal switcher without duplicating the system account', () => {
    vi.mocked(getCachedQuickSwitchAccounts).mockReturnValue([
      { label: 'Medical Representative — Amit', email: 'mr1@demo.qms.in', password: 'Test@123' },
      { label: 'System', email: 'system@gmail.com', password: 'Test@123' },
    ])

    renderPopup()

    expect(screen.getByText('mr1@demo.qms.in')).toBeInTheDocument()
    expect(screen.getAllByText('system@gmail.com')).toHaveLength(1)
  })

  it('clears role-scoped queries, logs into the selected account, then returns through the shared audience router', async () => {
    const user = userEvent.setup()
    const mutate = vi.fn((_credentials, options: { onSuccess?: () => void; onSettled?: () => void }) => {
      options.onSuccess?.()
      options.onSettled?.()
    })
    vi.mocked(useQuickSwitch).mockReturnValue({
      mutate,
      isPending: false,
      error: null,
    } as unknown as ReturnType<typeof useQuickSwitch>)
    const queryClient = new QueryClient()
    const clearSpy = vi.spyOn(queryClient, 'clear')
    const hrefSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, set href(value: string) { hrefSpy(value) } },
      writable: true,
      configurable: true,
    })

    renderPopup(queryClient)
    await user.click(screen.getByText('system@gmail.com'))

    expect(clearSpy).toHaveBeenCalledTimes(1)
    expect(mutate).toHaveBeenCalledWith(
      { email: 'system@gmail.com', password: 'Test@123' },
      expect.objectContaining({ onSuccess: expect.any(Function), onSettled: expect.any(Function) }),
    )
    expect(hrefSpy).toHaveBeenCalledWith(internalHref('/auth/continue'))
  })

  it('shows an honest login error and stays in the popup', () => {
    vi.mocked(useQuickSwitch).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: new Error('network failure'),
    } as unknown as ReturnType<typeof useQuickSwitch>)

    renderPopup()

    expect(screen.getByRole('alert')).toHaveTextContent(/could not switch/i)
  })
})
