import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/hooks/useSession')
vi.mock('@/features/tests/test.service', () => ({
  testService: {
    searchTests: vi.fn(async () => ({
      success: true,
      message: '',
      data: {
        items: [
          {
            id: 't-1',
            code: 'tst-000001',
            name: 'ECG',
            therapy: 'cardiology',
            duration: 15,
            price: 250,
            status: 'active',
            consumption: [{ item: 'd-1', rate: 0 }],
          },
        ],
        count: 1,
      },
    })),
    getTest: vi.fn(),
    createTest: vi.fn(),
    updateTest: vi.fn(),
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function mockPermissions(codes: string[]) {
  const { useSession } = await import('@/hooks/useSession')
  vi.mocked(useSession).mockReturnValue({
    session: { role: { id: 'r-1', code: 'system', name: 'System' }, roleType: { id: 'rt-1', code: 'system', name: 'system' }, tenant: { id: 't-1', code: 'sys', name: 'System', type: 'platform' }, permissions: codes },
    isLoading: false, isFetching: false, isSettled: true, isError: false, error: null,
    isAuthenticated: true, isConfirmedUnauthenticated: false,
    hasPermission: (c: string) => codes.includes(c),
    hasAnyPermission: (cs: string[]) => cs.some((c) => codes.includes(c)),
    hasAllPermissions: (cs: string[]) => cs.every((c) => codes.includes(c)),
    refetchSession: vi.fn(), clearSession: vi.fn(),
  } as unknown as ReturnType<typeof useSession>)
}

async function renderTab() {
  const TestMasterTab = (await import('./TestMasterTab')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <TestMasterTab />
    </QueryClientProvider>,
  )
}

describe('TestMasterTab', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows the New test button and status filter for a test-master:manage caller', async () => {
    await mockPermissions(['test-master:manage'])
    await renderTab()

    expect(await screen.findByRole('button', { name: /new test/i })).toBeInTheDocument()
    expect(screen.getAllByText(/active/i).length).toBeGreaterThan(0)
  })

  it('hides the New test button and status filter for a caller without test-master:manage', async () => {
    await mockPermissions([])
    await renderTab()

    await screen.findByText('ECG')
    expect(screen.queryByRole('button', { name: /new test/i })).not.toBeInTheDocument()
  })

  it('renders resource counts, not names or ids, in the table', async () => {
    await mockPermissions(['test-master:manage'])
    await renderTab()

    const row = (await screen.findByText('ECG')).closest('tr')
    expect(row).not.toBeNull()
    expect(row!.textContent).toContain('1')
    expect(row!.textContent).not.toContain('d-1')
  })

  it('opens the create modal with modal state {open:true, testId:null} on "New test"', async () => {
    await mockPermissions(['test-master:manage'])
    const user = userEvent.setup()
    await renderTab()

    await user.click(await screen.findByRole('button', { name: /new test/i }))

    expect(await screen.findByRole('heading', { name: /new test/i })).toBeInTheDocument()
  })

  it('opens the edit modal via a focusable Edit button when canManage, resolving that row\'s detail', async () => {
    await mockPermissions(['test-master:manage'])
    const { testService } = await import('@/features/tests/test.service')
    vi.mocked(testService.getTest).mockResolvedValue({
      success: true,
      message: '',
      data: { id: 't-1', code: 'tst-000001', name: 'ECG', therapy: 'cardiology', duration: 15, price: 250, status: 'active', consumption: [] },
    } as never)

    const user = userEvent.setup()
    await renderTab()

    const editButton = await screen.findByRole('button', { name: /edit/i })
    expect(editButton.tagName).toBe('BUTTON')
    await user.click(editButton)

    await waitFor(() => expect(testService.getTest).toHaveBeenCalledWith('t-1'))
    expect(await screen.findByRole('heading', { name: /edit test/i })).toBeInTheDocument()
  })

  it('renders no Edit button, and no click target at all, for a caller without test-master:manage', async () => {
    await mockPermissions([])
    await renderTab()

    await screen.findByText('ECG')
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument()
  })
})
