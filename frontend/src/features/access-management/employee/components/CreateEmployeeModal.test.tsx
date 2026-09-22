import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AxiosError } from 'axios'
import CreateEmployeeModal from './CreateEmployeeModal'

// LocationPicker/LocationAddressFields are Google Maps/geocoder-backed and awkward to render in
// jsdom — EmployeeFieldsSection's Location card (a manually-filled residential address) always
// mounts at the Employee-details step in every mode, so these are stubbed here the same way
// EditEmployeeEditor.test.tsx does, purely to keep these form-wiring tests isolated from the map.
vi.mock('@/components/widgets/location-picker/LocationPicker', () => ({ default: () => null }))
vi.mock('@/components/widgets/location-picker/LocationAddressFields', () => ({ default: () => null }))

function confirmedRejection() {
  const err = new AxiosError('Bad Request')
  err.response = { status: 400, data: {}, statusText: '', headers: {}, config: {} as never }
  return err
}

function networkError() {
  const err = new AxiosError('Network Error')
  err.response = undefined
  return err
}

vi.mock('@/features/access-management/employee/components/ExistingFieldOfficerPicker', () => ({
  default: ({ onChange }: { onChange: (v: unknown) => void }) => (
    <div>
      <button type="button" onClick={() => onChange({ userId: 'user-existing', email: 'existing@example.com', phone: '9999999999', gender: 'male', label: 'Existing FO' })}>
        Pick existing FO
      </button>
      <button type="button" onClick={() => onChange({ userId: 'user-existing-2', email: 'existing2@example.com', phone: '9999999998', label: 'Second FO' })}>
        Pick second FO (no gender)
      </button>
    </div>
  ),
}))

// The real DatePicker's react-day-picker Popover+Calendar is awkward to exercise through userEvent
// in jsdom — stubbed with the same value/onChange contract to keep this a pure form-wiring test.
vi.mock('@/components/ui/DatePicker', () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input aria-label="date-stub" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}))

const { createRole, createEmployee, searchRoles } = vi.hoisted(() => ({
  createRole: vi.fn(async () => ({ success: true, message: '', data: { id: 'role-1', user: 'user-1' } })),
  createEmployee: vi.fn(async () => ({ success: true, message: '', data: { id: 'emp-1' } })),
  searchRoles: vi.fn(async () => ({ success: true, message: '', data: { count: 0, items: [] } })),
}))

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    createRole,
    createEmployee,
    searchRoles,
    searchEmployees: vi.fn(async () => ({ success: true, message: '', data: { count: 0, items: [] } })),
  },
}))

function renderModal(props: Partial<React.ComponentProps<typeof CreateEmployeeModal>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CreateEmployeeModal
          tenantId="t-platform-1"
          foTypeId="rt-fo-1"
          canOnboardNewPerson
          canLinkExistingAccount
          {...props}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CreateEmployeeModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Mode A\'s Role-details step requires code+name before advancing', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByRole('button', { name: /new employee/i }))
    await user.click(screen.getByRole('button', { name: /^onboard a new person$/i }))

    await user.click(screen.getByRole('button', { name: /^next$/i }))

    expect(await screen.findByText(/code is required/i)).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 3 — Role details.')).toBeInTheDocument()
  })

  it('Mode A\'s final submit sends the User-step\'s email/phone as the Employee payload\'s email/phone', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByRole('button', { name: /new employee/i }))
    await user.click(screen.getByRole('button', { name: /^onboard a new person$/i }))

    await user.type(screen.getByLabelText('Code'), 'fo-ravi')
    await user.type(screen.getByLabelText('Name'), 'Ravi Kumar')
    await user.click(screen.getByRole('button', { name: /^next$/i }))

    await user.type(screen.getByLabelText('First name'), 'Ravi')
    await user.type(screen.getByLabelText('Email'), 'ravi@example.com')
    await user.type(screen.getByLabelText('Password'), 'Password1')
    await user.type(screen.getByLabelText(/^phone/i), '9876543210')
    await user.click(screen.getByRole('button', { name: /^next$/i }))

    await user.type(screen.getAllByLabelText('date-stub')[0], '2026-01-15')

    await user.click(screen.getByRole('button', { name: /create employee/i }))

    await waitFor(() => expect(createEmployee).toHaveBeenCalled())
    expect(createRole).toHaveBeenCalledWith(expect.objectContaining({
      user: expect.objectContaining({ email: 'ravi@example.com', phone: '9876543210' }),
    }))
    expect(createEmployee).toHaveBeenCalledWith(expect.objectContaining({ email: 'ravi@example.com', phone: '9876543210', user: 'user-1' }))
  })

  it('skips the mode toggle entirely when only canLinkExistingAccount is true', async () => {
    const user = userEvent.setup()
    renderModal({ canOnboardNewPerson: false, canLinkExistingAccount: true })
    await user.click(screen.getByRole('button', { name: /new employee/i }))

    expect(screen.queryByRole('button', { name: /^onboard a new person$/i })).not.toBeInTheDocument()
    expect(screen.getByText('Step 1 of 2 — Select account.')).toBeInTheDocument()
  })

  it('skips the mode toggle entirely when only canOnboardNewPerson is true', async () => {
    const user = userEvent.setup()
    renderModal({ canOnboardNewPerson: true, canLinkExistingAccount: false })
    await user.click(screen.getByRole('button', { name: /new employee/i }))

    expect(screen.queryByRole('button', { name: /^link an existing account$/i })).not.toBeInTheDocument()
    expect(screen.getByText('Step 1 of 3 — Role details.')).toBeInTheDocument()
  })

  it('Mode B (link existing account) includes the modal\'s tenant in the Employee create payload — every allowed actor is platform-scoped, so this 400s without it', async () => {
    const user = userEvent.setup()
    renderModal({ canOnboardNewPerson: false, canLinkExistingAccount: true })
    await user.click(screen.getByRole('button', { name: /new employee/i }))

    await user.click(screen.getByRole('button', { name: /^pick existing fo$/i }))
    await user.click(screen.getByRole('button', { name: /^next$/i }))

    await user.type(screen.getAllByLabelText('date-stub')[0], '2026-01-15')
    await user.click(screen.getByRole('button', { name: /create employee/i }))

    await waitFor(() => expect(createEmployee).toHaveBeenCalled())
    expect(createEmployee).toHaveBeenCalledWith(expect.objectContaining({ user: 'user-existing', tenant: 't-platform-1' }))
  })

  it('Mode B rapidly double-submitted fires exactly one Employee POST, and a successful create still closes the modal and navigates rather than getting stuck on a stray error', async () => {
    const user = userEvent.setup()
    renderModal({ canOnboardNewPerson: false, canLinkExistingAccount: true })
    await user.click(screen.getByRole('button', { name: /new employee/i }))

    await user.click(screen.getByRole('button', { name: /^pick existing fo$/i }))
    await user.click(screen.getByRole('button', { name: /^next$/i }))
    await user.type(screen.getAllByLabelText('date-stub')[0], '2026-01-15')

    const createCall = pending<Awaited<ReturnType<typeof createEmployee>>>()
    createEmployee.mockImplementationOnce(() => createCall.promise)

    const submitButton = screen.getByRole('button', { name: /create employee/i })
    fireEvent.click(submitButton)
    fireEvent.click(submitButton)
    fireEvent.click(submitButton)

    createCall.resolve({ success: true, message: '', data: { id: 'emp-linked' } })

    await waitFor(() => expect(screen.queryByText('New employee')).not.toBeInTheDocument())
    // Exactly one dispatch despite the 3 rapid clicks — no duplicate/rejected follow-up call landed
    // after the success and clobbered the UI into a false-failure state.
    expect(createEmployee).toHaveBeenCalledTimes(1)
  })

  it('renders nothing at all when neither creation mode is usable', () => {
    const { container } = renderModal({ canOnboardNewPerson: false, canLinkExistingAccount: false })
    expect(container).toBeEmptyDOMElement()
  })

  it('auto-opens directly into Mode A when mounted with autoOpenNewPerson, and calls onAutoOpenHandled', async () => {
    const onAutoOpenHandled = vi.fn()
    renderModal({ autoOpenNewPerson: true, onAutoOpenHandled })

    expect(await screen.findByText('New employee')).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 3 — Role details.')).toBeInTheDocument()
    expect(onAutoOpenHandled).toHaveBeenCalled()
  })

  it('does not auto-open when canOnboardNewPerson is false, even if autoOpenNewPerson is true', () => {
    renderModal({ autoOpenNewPerson: true, canOnboardNewPerson: false, canLinkExistingAccount: true })
    expect(screen.queryByText('New employee')).not.toBeInTheDocument()
  })

  async function fillAndSubmitModeA(user: ReturnType<typeof userEvent.setup>) {
    renderModal()
    await user.click(screen.getByRole('button', { name: /new employee/i }))
    await user.click(screen.getByRole('button', { name: /^onboard a new person$/i }))

    await user.type(screen.getByLabelText('Code'), 'fo-ravi')
    await user.type(screen.getByLabelText('Name'), 'Ravi Kumar')
    await user.click(screen.getByRole('button', { name: /^next$/i }))

    await user.type(screen.getByLabelText('First name'), 'Ravi')
    await user.type(screen.getByLabelText('Email'), 'ravi@example.com')
    await user.type(screen.getByLabelText('Password'), 'Password1')
    await user.type(screen.getByLabelText(/^phone/i), '9876543210')
    await user.click(screen.getByRole('button', { name: /^next$/i }))

    await user.type(screen.getAllByLabelText('date-stub')[0], '2026-01-15')
    await user.click(screen.getByRole('button', { name: /create employee/i }))
  }

  it('a CONFIRMED (4xx) Role/User creation failure shows the error banner, and retrying calls createRole again, never createEmployee for the failed attempt', async () => {
    createRole.mockRejectedValueOnce(confirmedRejection())
    const user = userEvent.setup()
    await fillAndSubmitModeA(user)

    expect(await screen.findByText(/couldn't create the account/i)).toBeInTheDocument()
    expect(createEmployee).not.toHaveBeenCalled()

    // Retry — the button is still "Create employee" and the form still holds the same values.
    await user.click(screen.getByRole('button', { name: /create employee/i }))

    await waitFor(() => expect(createRole).toHaveBeenCalledTimes(2))
    expect(createEmployee).toHaveBeenCalledTimes(1)
  })

  it('an AMBIGUOUS (network error) Role/User creation failure shows the uncertain banner, blocks a blind resubmit, and "Check again" recovers by finding the Role and continuing straight into Employee creation', async () => {
    createRole.mockRejectedValueOnce(networkError())
    const user = userEvent.setup()
    await fillAndSubmitModeA(user)

    expect(await screen.findByText(/couldn't confirm whether the account was created/i)).toBeInTheDocument()
    expect(createRole).toHaveBeenCalledTimes(1)
    expect(createEmployee).not.toHaveBeenCalled()

    // The main submit button is disabled (and relabeled) while uncertain — "Check again" is the
    // only way forward.
    expect(screen.getByRole('button', { name: /creating…/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^back$/i })).toBeDisabled()

    // The transaction actually committed server-side — searchRoles finds it.
    searchRoles.mockResolvedValueOnce({
      success: true, message: '', data: {
        count: 1,
        items: [{ id: 'role-1', code: 'fo-ravi', user: { _id: 'user-1', firstName: 'Ravi', lastName: 'Kumar', email: 'ravi@example.com', phone: '9876543210' } }],
      },
    } as never)

    await user.click(screen.getByRole('button', { name: /check again/i }))

    await waitFor(() => expect(createEmployee).toHaveBeenCalledTimes(1))
    expect(createEmployee).toHaveBeenCalledWith(expect.objectContaining({ user: 'user-1', email: 'ravi@example.com', phone: '9876543210' }))
    // Still just once — the check recovered the existing account, never re-created it.
    expect(createRole).toHaveBeenCalledTimes(1)
  })

  it('"Check again" finding nothing falls back to the confirmed-failure state (a fresh retry is then safe)', async () => {
    createRole.mockRejectedValueOnce(networkError())
    const user = userEvent.setup()
    await fillAndSubmitModeA(user)

    await screen.findByText(/couldn't confirm whether the account was created/i)
    searchRoles.mockResolvedValueOnce({ success: true, message: '', data: { count: 0, items: [] } })

    await user.click(screen.getByRole('button', { name: /check again/i }))

    expect(await screen.findByText(/couldn't create the account/i)).toBeInTheDocument()
    expect(createEmployee).not.toHaveBeenCalled()
  })

  it('"Check again" finding a role with a MISMATCHED linked-user email shows the distinguishing message and never attaches an Employee', async () => {
    createRole.mockRejectedValueOnce(networkError())
    const user = userEvent.setup()
    await fillAndSubmitModeA(user)

    await screen.findByText(/couldn't confirm whether the account was created/i)
    // A different, unrelated role happens to occupy the same code — a concurrent-race scenario.
    searchRoles.mockResolvedValueOnce({
      success: true, message: '', data: {
        count: 1,
        items: [{ id: 'role-2', code: 'fo-ravi', user: { _id: 'user-stranger', firstName: 'Someone', lastName: 'Else', email: 'stranger@example.com', phone: '9000000000' } }],
      },
    } as never)

    await user.click(screen.getByRole('button', { name: /check again/i }))

    expect(await screen.findByText(/a different account was found for this code/i)).toBeInTheDocument()
    expect(createEmployee).not.toHaveBeenCalled()
  })

  it('"Check again" with an invalid employee field (DOJ cleared) shows field errors instead of throwing, and never looks up the role or creates an employee', async () => {
    createRole.mockRejectedValueOnce(networkError())
    const user = userEvent.setup()
    await fillAndSubmitModeA(user)

    await screen.findByText(/couldn't confirm whether the account was created/i)

    const dateStub = screen.getAllByLabelText('date-stub')[0]
    await user.clear(dateStub)

    await user.click(screen.getByRole('button', { name: /check again/i }))

    expect(await screen.findByText(/date of joining is required/i)).toBeInTheDocument()
    expect(searchRoles).not.toHaveBeenCalled()
    expect(createEmployee).not.toHaveBeenCalled()
    // Still uncertain — the invalid edit did not silently resolve or fail the recovery flow.
    expect(screen.getByText(/couldn't confirm whether the account was created/i)).toBeInTheDocument()
  })

  it('"Check again" submits the LIVE employee-fields values, not the stale snapshot from the moment of the original failure', async () => {
    createRole.mockRejectedValueOnce(networkError())
    const user = userEvent.setup()
    await fillAndSubmitModeA(user)

    await screen.findByText(/couldn't confirm whether the account was created/i)

    // The Employee-fields step stays editable during the uncertain window — change the DOJ here.
    const dateStub = screen.getAllByLabelText('date-stub')[0]
    await user.clear(dateStub)
    await user.type(dateStub, '2026-03-01')

    searchRoles.mockResolvedValueOnce({
      success: true, message: '', data: {
        count: 1,
        items: [{ id: 'role-1', code: 'fo-ravi', user: { _id: 'user-1', firstName: 'Ravi', lastName: 'Kumar', email: 'ravi@example.com', phone: '9876543210' } }],
      },
    } as never)

    await user.click(screen.getByRole('button', { name: /check again/i }))

    await waitFor(() => expect(createEmployee).toHaveBeenCalledTimes(1))
    expect(createEmployee).toHaveBeenCalledWith(expect.objectContaining({ doj: '2026-03-01' }))
  })

  it('employee-uncertain (ambiguous Employee-POST failure after a successful Role/User create) disables the main submit button and Back/Next, and "Check again" is the only way to progress', async () => {
    createEmployee.mockRejectedValueOnce(networkError())
    const user = userEvent.setup()
    await fillAndSubmitModeA(user)

    expect(await screen.findByText(/couldn't confirm the employee record/i)).toBeInTheDocument()
    expect(createRole).toHaveBeenCalledTimes(1)
    expect(createEmployee).toHaveBeenCalledTimes(1)

    expect(screen.getByRole('button', { name: /creating…/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^back$/i })).toBeDisabled()

    // The Employee record was NOT actually created — "Check again" finds nothing and returns to
    // account-created, from which the main submit button retries the Employee POST alone.
    await user.click(screen.getByRole('button', { name: /check again/i }))
    await screen.findByText(/account created for ravi/i)

    await user.click(screen.getByRole('button', { name: /^create employee$/i }))

    await waitFor(() => expect(createEmployee).toHaveBeenCalledTimes(2))
    // A second Role/User was never created — recovery only ever retried the Employee POST.
    expect(createRole).toHaveBeenCalledTimes(1)
  })

  it('account-created (Role/User succeeded, about to retry Employee) locks Back/Next but keeps the main submit button enabled for the Employee-only retry', async () => {
    createEmployee.mockRejectedValueOnce(confirmedRejection())
    const user = userEvent.setup()
    await fillAndSubmitModeA(user)

    expect(await screen.findByText(/account created for ravi/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^back$/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^create employee$/i })).not.toBeDisabled()

    await user.click(screen.getByRole('button', { name: /^create employee$/i }))

    await waitFor(() => expect(createEmployee).toHaveBeenCalledTimes(2))
    // Still just the one Role/User creation — the retry never re-touches it.
    expect(createRole).toHaveBeenCalledTimes(1)
  })

  function pending<T>() {
    let resolve!: (v: T) => void
    const promise = new Promise<T>((r) => { resolve = r })
    return { promise, resolve }
  }

  it('rapidly double-submitting the account-created (Employee-only retry) state fires exactly one Employee POST — retryEmployee is awaited, not fire-and-forget, so the ref guard stays held for its whole duration', async () => {
    createEmployee.mockRejectedValueOnce(confirmedRejection())
    const user = userEvent.setup()
    await fillAndSubmitModeA(user)

    expect(await screen.findByText(/account created for ravi/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^create employee$/i })).not.toBeDisabled()

    // The retry's Employee POST is deferred — while it's in flight, a second rapid click must be a
    // no-op. If retryEmployee were still fire-and-forget, submittingRef would release as soon as
    // submitNewPerson returns (immediately after dispatching the retry, not after it settles),
    // reopening the exact race this guard exists to close.
    const retryCall = pending<Awaited<ReturnType<typeof createEmployee>>>()
    createEmployee.mockImplementationOnce(() => retryCall.promise)

    const submitButton = screen.getByRole('button', { name: /^create employee$/i })
    fireEvent.click(submitButton)
    fireEvent.click(submitButton)
    fireEvent.click(submitButton)

    retryCall.resolve({ success: true, message: '', data: { id: 'emp-2' } })

    await waitFor(() => expect(createEmployee).toHaveBeenCalledTimes(2))
    // Still exactly 2 total: the original failed attempt (from fillAndSubmitModeA) + this one retry
    // — never 3 or 4, despite the 3 rapid clicks.
    expect(createEmployee).toHaveBeenCalledTimes(2)
    expect(createRole).toHaveBeenCalledTimes(1)
  })

  it('rapidly double-clicking "Check again" during account-creation-uncertain fires exactly one searchRoles call — the shared submittingRef closes the same-tick race the state.step guard alone can\'t', async () => {
    createRole.mockRejectedValueOnce(networkError())
    const user = userEvent.setup()
    await fillAndSubmitModeA(user)
    await screen.findByText(/couldn't confirm whether the account was created/i)

    const checkCall = pending<Awaited<ReturnType<typeof searchRoles>>>()
    searchRoles.mockImplementationOnce(() => checkCall.promise)

    const checkAgainButton = screen.getByRole('button', { name: /check again/i })
    fireEvent.click(checkAgainButton)
    fireEvent.click(checkAgainButton)
    fireEvent.click(checkAgainButton)

    checkCall.resolve({ success: true, message: '', data: { count: 0, items: [] } })

    await waitFor(() => expect(searchRoles).toHaveBeenCalledTimes(1))
    expect(searchRoles).toHaveBeenCalledTimes(1)
  })

  it('rapidly double-clicking "Check again" during employee-uncertain fires exactly one searchEmployees call', async () => {
    createEmployee.mockRejectedValueOnce(networkError())
    const user = userEvent.setup()
    await fillAndSubmitModeA(user)
    await screen.findByText(/couldn't confirm the employee record/i)

    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    type SearchEmployeesResult = { success: boolean; message: string; data: { count: number; items: unknown[] } }
    const searchEmployees = accessManagementService.searchEmployees as unknown as (...args: unknown[]) => Promise<SearchEmployeesResult>
    const checkCall = pending<SearchEmployeesResult>()
    vi.mocked(searchEmployees).mockImplementationOnce(() => checkCall.promise)

    // This handler's re-entrancy check (onboard.checkIfEmployeeExists's `state.step !== ...` guard)
    // sits behind almost no async work before its setState — by the time a second fireEvent.click
    // would fire, React has already synchronously re-rendered the button as disabled, so a real
    // DOM double-click can't reach the handler twice here (confirmed: that version of this test
    // passed even without the fix). Dispatching the click handler directly, twice, without
    // awaiting the first, reproduces the actual race the fix closes — two calls starting before
    // either's setState commits — independent of how fast the DOM happens to re-render.
    const clickAgain = () => screen.getByRole('button', { name: /check again/i }).click()
    act(() => {
      clickAgain()
      clickAgain()
    })

    checkCall.resolve({ success: true, message: '', data: { count: 0, items: [] } })

    await waitFor(() => expect(searchEmployees).toHaveBeenCalledTimes(1))
    expect(searchEmployees).toHaveBeenCalledTimes(1)
  })

  async function assertForcedSubmitIsNoOp() {
    createRole.mockClear()
    createEmployee.mockClear()
    searchRoles.mockClear()

    const form = document.querySelector('form')!
    // RHF's handleSubmit runs its (async) Zod resolver before invoking the inner submit handler,
    // which itself calls submitNewPerson/submitExisting fire-and-forget — wrapping in a flushed
    // act() (rather than a bare fireEvent + an empty waitFor tick) actually drains that whole
    // microtask chain before the assertions below run, so this would genuinely fail if the guard
    // were ever removed instead of just racing ahead of it.
    await act(async () => {
      fireEvent.submit(form)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(createRole).not.toHaveBeenCalled()
    expect(createEmployee).not.toHaveBeenCalled()
    expect(searchRoles).not.toHaveBeenCalled()
  }

  it('a forced submit (bypassing the disabled button) is a pure no-op during employee-uncertain', async () => {
    createEmployee.mockRejectedValueOnce(networkError())
    const user = userEvent.setup()
    await fillAndSubmitModeA(user)
    await screen.findByText(/couldn't confirm the employee record/i)

    await assertForcedSubmitIsNoOp()
  })

  it('a forced submit is a pure no-op during account-creation-uncertain', async () => {
    createRole.mockRejectedValueOnce(networkError())
    const user = userEvent.setup()
    await fillAndSubmitModeA(user)
    await screen.findByText(/couldn't confirm whether the account was created/i)

    await assertForcedSubmitIsNoOp()
  })

  it('a forced submit is a pure no-op during checking-account (the in-flight recovery lookup)', async () => {
    createRole.mockRejectedValueOnce(networkError())
    const user = userEvent.setup()
    await fillAndSubmitModeA(user)
    await screen.findByText(/couldn't confirm whether the account was created/i)

    const check = pending<Awaited<ReturnType<typeof searchRoles>>>()
    searchRoles.mockImplementationOnce(() => check.promise)
    await user.click(screen.getByRole('button', { name: /check again/i }))
    await screen.findByRole('button', { name: /checking…/i })

    await assertForcedSubmitIsNoOp()

    check.resolve({ success: true, message: '', data: { count: 0, items: [] } })
    await screen.findByText(/couldn't create the account/i)
  })

  it('a forced submit is a pure no-op during checking-employee (the in-flight recovery lookup)', async () => {
    createEmployee.mockRejectedValueOnce(networkError())
    const user = userEvent.setup()
    await fillAndSubmitModeA(user)
    await screen.findByText(/couldn't confirm the employee record/i)

    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    type SearchEmployeesResult = { success: boolean; message: string; data: { count: number; items: unknown[] } }
    const searchEmployees = accessManagementService.searchEmployees as unknown as (...args: unknown[]) => Promise<SearchEmployeesResult>
    const check = pending<SearchEmployeesResult>()
    vi.mocked(searchEmployees).mockImplementationOnce(() => check.promise)
    await user.click(screen.getByRole('button', { name: /check again/i }))
    await screen.findByRole('button', { name: /checking…/i })

    await assertForcedSubmitIsNoOp()

    check.resolve({ success: true, message: '', data: { count: 0, items: [] } })
    await screen.findByText(/account created for ravi/i)
  })

  it('a forced submit is a pure no-op during creating-account (the initial Role/User POST in flight)', async () => {
    const roleCall = pending<Awaited<ReturnType<typeof createRole>>>()
    createRole.mockImplementationOnce(() => roleCall.promise)
    const user = userEvent.setup()
    await fillAndSubmitModeA(user)

    expect(await screen.findByText(/complete or resolve this employee creation before closing/i)).toBeInTheDocument()

    await assertForcedSubmitIsNoOp()

    roleCall.resolve({ success: true, message: '', data: { id: 'role-1', user: 'user-1' } })
    await screen.findByText(/step 3 of 3/i)
  })

  it('a forced submit is a pure no-op during creating-employee (the Employee POST in flight, after Role/User already succeeded)', async () => {
    const employeeCall = pending<Awaited<ReturnType<typeof createEmployee>>>()
    createEmployee.mockImplementationOnce(() => employeeCall.promise)
    const user = userEvent.setup()
    await fillAndSubmitModeA(user)

    expect(await screen.findByText(/complete or resolve this employee creation before closing/i)).toBeInTheDocument()
    // The Role/User POST already resolved by this point — only the Employee POST is pending.
    expect(createRole).toHaveBeenCalledTimes(1)

    await assertForcedSubmitIsNoOp()

    employeeCall.resolve({ success: true, message: '', data: { id: 'emp-1' } })
  })

  it('closing the dialog (Esc via onOpenChange) is a no-op while employee-uncertain', async () => {
    createEmployee.mockRejectedValueOnce(networkError())
    const user = userEvent.setup()
    await fillAndSubmitModeA(user)
    await screen.findByText(/couldn't confirm the employee record/i)

    await user.keyboard('{Escape}')

    // Still open, state unchanged — closing during a locked state must not discard it.
    expect(screen.getByText(/couldn't confirm the employee record/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /check again/i })).toBeInTheDocument()
  })

  it('closing the dialog (Esc via onOpenChange) is a no-op while creating-account, and the in-flight POST still lands once it settles', async () => {
    const roleCall = pending<Awaited<ReturnType<typeof createRole>>>()
    createRole.mockImplementationOnce(() => roleCall.promise)
    const user = userEvent.setup()
    await fillAndSubmitModeA(user)
    await screen.findByText(/complete or resolve this employee creation before closing/i)

    await user.keyboard('{Escape}')

    // Still open and still in the same in-flight state — resetAndClose() must not have run, or
    // onboard.reset() would have discarded the request's eventual outcome underneath it.
    expect(screen.getByText('New employee')).toBeInTheDocument()
    expect(screen.getByText(/complete or resolve this employee creation before closing/i)).toBeInTheDocument()

    roleCall.resolve({ success: true, message: '', data: { id: 'role-1', user: 'user-1' } })

    // The POST that was in flight when Esc was pressed still resolves into the modal's own state
    // (proceeding into the Employee step), not lost to a close that never should have happened.
    await screen.findByText(/step 3 of 3/i)
  })

  it('closing the dialog (Esc via onOpenChange) works normally while idle, resetting the form', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByRole('button', { name: /new employee/i }))
    await user.click(screen.getByRole('button', { name: /^onboard a new person$/i }))
    await user.type(screen.getByLabelText('Code'), 'fo-ravi')

    expect(screen.getByText('New employee')).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(screen.queryByText('New employee')).not.toBeInTheDocument()

    // Reopening starts fresh — resetAndClose actually ran, the Code field was not preserved.
    await user.click(screen.getByRole('button', { name: /new employee/i }))
    await user.click(screen.getByRole('button', { name: /^onboard a new person$/i }))
    expect(screen.getByLabelText('Code')).toHaveValue('')
  })

  it('checking-employee shows a disabled "Checking…" state in the same banner used for employee-uncertain', async () => {
    createEmployee.mockRejectedValueOnce(networkError())
    const user = userEvent.setup()
    await fillAndSubmitModeA(user)
    await screen.findByText(/couldn't confirm the employee record/i)

    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const searchEmployees = accessManagementService.searchEmployees as ReturnType<typeof vi.fn>
    let resolveCheck!: (v: unknown) => void
    searchEmployees.mockImplementationOnce(() => new Promise((resolve) => { resolveCheck = resolve }))

    await user.click(screen.getByRole('button', { name: /check again/i }))

    expect(await screen.findByRole('button', { name: /checking…/i })).toBeDisabled()
    // Navigation stays locked throughout — checking-employee is still isAccountCommittedOrPending.
    expect(screen.getByRole('button', { name: /^back$/i })).toBeDisabled()

    resolveCheck({ success: true, message: '', data: { count: 0, items: [] } })
    await screen.findByText(/account created for ravi/i)
  })

  async function goToModeBEmployeeStep(user: ReturnType<typeof userEvent.setup>, pickButtonName: RegExp = /^pick existing fo$/i) {
    renderModal({ canOnboardNewPerson: false, canLinkExistingAccount: true })
    await user.click(screen.getByRole('button', { name: /new employee/i }))
    await user.click(screen.getByRole('button', { name: pickButtonName }))
    await user.click(screen.getByRole('button', { name: /^next$/i }))
  }

  it('Mode B: picking an FO with a gender submits it in the Employee create payload', async () => {
    const user = userEvent.setup()
    await goToModeBEmployeeStep(user)

    await user.type(screen.getAllByLabelText('date-stub')[0], '2026-01-15')
    await user.click(screen.getByRole('button', { name: /create employee/i }))

    await waitFor(() => expect(createEmployee).toHaveBeenCalled())
    expect(createEmployee).toHaveBeenCalledWith(expect.objectContaining({
      profile: expect.objectContaining({ gender: 'male' }),
    }))
  })

  it('Mode B: switching from FO A (has a gender) to FO B (no gender) clears it — no stale carry-over', async () => {
    const user = userEvent.setup()
    renderModal({ canOnboardNewPerson: false, canLinkExistingAccount: true })
    await user.click(screen.getByRole('button', { name: /new employee/i }))

    await user.click(screen.getByRole('button', { name: /^pick existing fo$/i }))
    await user.click(screen.getByRole('button', { name: /pick second fo/i }))
    await user.click(screen.getByRole('button', { name: /^next$/i }))

    await user.type(screen.getAllByLabelText('date-stub')[0], '2026-01-15')
    await user.click(screen.getByRole('button', { name: /create employee/i }))

    await waitFor(() => expect(createEmployee).toHaveBeenCalled())
    expect(createEmployee).not.toHaveBeenCalledWith(expect.objectContaining({ profile: expect.objectContaining({ gender: expect.anything() }) }))
  })

  it('Mode B → Mode A: switching modes clears the picked FO\'s gender', async () => {
    const user = userEvent.setup()
    renderModal({ canOnboardNewPerson: true, canLinkExistingAccount: true })
    await user.click(screen.getByRole('button', { name: /new employee/i }))
    await user.click(screen.getByRole('button', { name: /^link an existing account$/i }))

    await user.click(screen.getByRole('button', { name: /^pick existing fo$/i }))

    await user.click(screen.getByRole('button', { name: /^onboard a new person$/i }))
    await user.type(screen.getByLabelText('Code'), 'fo-new')
    await user.type(screen.getByLabelText('Name'), 'New Person')
    await user.click(screen.getByRole('button', { name: /^next$/i }))
    await user.type(screen.getByLabelText('First name'), 'New')
    await user.type(screen.getByLabelText('Email'), 'new@example.com')
    await user.type(screen.getByLabelText('Password'), 'Password1')
    await user.type(screen.getByLabelText(/^phone/i), '9111111111')
    await user.click(screen.getByRole('button', { name: /^next$/i }))

    await user.type(screen.getAllByLabelText('date-stub')[0], '2026-01-15')
    await user.click(screen.getByRole('button', { name: /create employee/i }))

    await waitFor(() => expect(createEmployee).toHaveBeenCalled())
    expect(createRole).toHaveBeenCalled()
    expect(createEmployee).not.toHaveBeenCalledWith(expect.objectContaining({ profile: expect.objectContaining({ gender: expect.anything() }) }))
  })

  it('Mode B: clicking the already-active "Link an existing account" segment again is a no-op — does not clear the current pick', async () => {
    const user = userEvent.setup()
    renderModal({ canOnboardNewPerson: true, canLinkExistingAccount: true })
    await user.click(screen.getByRole('button', { name: /new employee/i }))
    await user.click(screen.getByRole('button', { name: /^link an existing account$/i }))

    await user.click(screen.getByRole('button', { name: /^pick existing fo$/i }))
    await user.click(screen.getByRole('button', { name: /^link an existing account$/i }))

    // Still on step 0 with the pick intact — Next stays enabled, proving `picked` wasn't cleared.
    expect(screen.getByText('Step 1 of 2 — Select account.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^next$/i })).not.toBeDisabled()
  })
})
