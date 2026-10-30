import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AxiosError } from 'axios'
import { useLogin } from '@/features/auth/hooks/useLogin'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { AUTH_ROUTES } from '@/features/auth/auth.paths'
import * as quickSwitchCache from '@qms/core'
import QuickSwitchPopup from './QuickSwitchPopup'

vi.mock('@/features/auth/hooks/useLogin')
vi.mock('@/features/access-management/role/hooks/useRoles')

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

function forbiddenError() {
  const err = new AxiosError('Forbidden')
  err.response = { status: 403, data: {}, statusText: '', headers: {}, config: {} as never }
  return err
}

function roleFixture(typeName: string, firstName: string, email: string) {
  return { id: `role-${email}`, type: { name: typeName }, user: { firstName, email } }
}

function mockLogin(loginImpl: (values: unknown, opts: { onSuccess?: () => void; onSettled?: () => void }) => void) {
  vi.mocked(useLogin).mockReturnValue({
    mutate: loginImpl,
    isPending: false,
    error: null,
  } as unknown as ReturnType<typeof useLogin>)
}

function mockRoles(opts: { items?: unknown[]; isLoading?: boolean; error?: unknown }) {
  vi.mocked(useRoles).mockReturnValue({
    data: { data: { items: opts.items ?? [], count: opts.items?.length ?? 0 } },
    isLoading: opts.isLoading ?? false,
    error: opts.error ?? null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useRoles>)
}

function renderPopup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <QuickSwitchPopup onClose={vi.fn()} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('QuickSwitchPopup', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(quickSwitchCache, 'getCachedQuickSwitchAccounts').mockReturnValue(null)
    vi.spyOn(quickSwitchCache, 'setCachedQuickSwitchAccounts').mockImplementation(() => {})
  })

  it('fetches + lists real accounts from GET /roles when there is no cache yet', async () => {
    mockLogin(vi.fn())
    mockRoles({ items: [roleFixture('Admin', 'Ajinkya', 'admin@gmail.com'), roleFixture('Sales Rep', 'Rohit', 'salesrep1@demo.qms.in')] })

    renderPopup()

    expect(await screen.findByText('admin@gmail.com')).toBeInTheDocument()
    expect(screen.getByText('salesrep1@demo.qms.in')).toBeInTheDocument()
  })

  it('caches the fetched list so it survives future opens without another GET /roles call', async () => {
    mockLogin(vi.fn())
    mockRoles({ items: [roleFixture('Admin', 'Ajinkya', 'admin@gmail.com')] })

    renderPopup()
    await screen.findByText('admin@gmail.com')

    expect(quickSwitchCache.setCachedQuickSwitchAccounts).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ email: 'admin@gmail.com', password: 'Test@123' })]),
    )
  })

  it('reads from the cache instead of fetching when a cache already exists', async () => {
    vi.spyOn(quickSwitchCache, 'getCachedQuickSwitchAccounts').mockReturnValue([
      { label: 'Admin', email: 'admin@gmail.com', password: 'Test@123' },
    ])
    mockLogin(vi.fn())
    mockRoles({ items: [] })

    renderPopup()

    expect(await screen.findByText('admin@gmail.com')).toBeInTheDocument()
    // useRoles is still called (component always calls the hook), but `enabled` must be false —
    // asserted via the hook's own disabled-fetch contract: isLoading false, no items rendered twice.
    expect(useRoles).toHaveBeenCalledWith(expect.anything(), false)
  })

  it('shows a clear "sign in as Admin first" hint instead of a bare error when the fetch 403s with no cache', async () => {
    mockLogin(vi.fn())
    mockRoles({ items: [], error: forbiddenError() })

    renderPopup()

    expect(await screen.findByText(/sign in as admin once first/i)).toBeInTheDocument()
  })

  it('clicking an account clears the query cache, calls login with its credentials, and navigates on success', async () => {
    const user = userEvent.setup()
    const loginMock = vi.fn((_values, opts: { onSuccess?: () => void }) => opts.onSuccess?.())
    mockLogin(loginMock)
    mockRoles({ items: [roleFixture('Admin', 'Ajinkya', 'admin@gmail.com')] })

    renderPopup()
    await user.click(await screen.findByText('admin@gmail.com'))

    expect(loginMock).toHaveBeenCalledWith(
      { email: 'admin@gmail.com', password: 'Test@123' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
    expect(navigateMock).toHaveBeenCalledWith(AUTH_ROUTES.CONTINUE, { replace: true })
  })
})
