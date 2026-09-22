import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { usePermission } from '@/hooks/usePermission'
import { useEmployee } from '@/features/access-management/employee/hooks/useEmployee'

vi.mock('@/hooks/usePermission')
vi.mock('@/features/access-management/employee/hooks/useEmployee')
vi.mock('@/features/access-management/employee/components/EditEmployeeEditor', () => ({
  default: () => <div>Edit employee editor</div>,
}))

function sessionFixture(roleTypeCode: string) {
  return { tenant: { id: 't-1', type: 'platform' }, roleType: { code: roleTypeCode } }
}

async function renderPage(permissionOverrides: Record<string, unknown> = {}) {
  vi.mocked(usePermission).mockReturnValue({
    session: sessionFixture('admin'), permissions: ['tenant:admin'],
    isSettled: true, isFetching: false, isError: false, isConfirmedUnauthenticated: false, refetch: vi.fn(),
    ...permissionOverrides,
  } as unknown as ReturnType<typeof usePermission>)
  const EmployeeDetailPage = (await import('./EmployeeDetailPage')).default
  return render(
    <MemoryRouter initialEntries={['/admin/employees/emp-1']}>
      <Routes>
        <Route path="/admin/employees/:id" element={<EmployeeDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('EmployeeDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows a retry-able error state (not "not found") on an API/network failure', async () => {
    const refetch = vi.fn()
    vi.mocked(useEmployee).mockReturnValue({ data: undefined, isLoading: false, error: new Error('network down'), refetch } as never)

    await renderPage()

    expect(await screen.findByText(/failed to load employee/i)).toBeInTheDocument()
    expect(screen.queryByText(/not found/i)).not.toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /retry/i }))
    expect(refetch).toHaveBeenCalled()
  })

  it('shows "not found" only when there is genuinely no error and no data (a real 404/inaccessible record)', async () => {
    vi.mocked(useEmployee).mockReturnValue({ data: undefined, isLoading: false, error: null, refetch: vi.fn() } as never)

    await renderPage()

    expect(await screen.findByText(/not found, or you don't have access/i)).toBeInTheDocument()
  })

  it('renders the editor for a manage-capable session once the employee loads', async () => {
    vi.mocked(useEmployee).mockReturnValue({
      data: { data: { id: 'emp-1', email: 'a@example.com', phone: '123', doj: '2026-01-01', status: 'active', user: 'u-1', tenant: 't-1' } },
      isLoading: false, error: null, refetch: vi.fn(),
    } as never)

    await renderPage()

    expect(await screen.findByText('Edit employee editor')).toBeInTheDocument()
  })

  it('renders the read-only view (not the editor) for a non-manage-capable session, e.g. a field officer viewing their own record', async () => {
    vi.mocked(useEmployee).mockReturnValue({
      data: { data: { id: 'emp-1', email: 'a@example.com', phone: '123', doj: '2026-01-01', status: 'active', user: 'u-1', tenant: 't-1' } },
      isLoading: false, error: null, refetch: vi.fn(),
    } as never)

    await renderPage({ session: { tenant: { id: 't-1', type: 'platform' }, roleType: { code: 'field-officer' } }, permissions: [] })

    expect(await screen.findByText('a@example.com')).toBeInTheDocument()
    expect(screen.queryByText('Edit employee editor')).not.toBeInTheDocument()
  })
})
