import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import EditEmployeeEditor from './EditEmployeeEditor'
import { useUpdateEmployee } from '@/features/access-management/employee/hooks/useUpdateEmployee'
import type { EmployeeEntity, UpdateEmployeePayload } from '@/types/accessManagement.types'

vi.mock('@/features/access-management/employee/hooks/useUpdateEmployee')
vi.mock('@/components/widgets/location-picker/LocationPicker', () => ({ default: () => null }))
vi.mock('@/components/widgets/location-picker/LocationAddressFields', () => ({ default: () => null }))
vi.mock('@/components/ui/DatePicker', () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input aria-label="date-stub" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}))

function employeeFixture(overrides: Partial<EmployeeEntity> = {}): EmployeeEntity {
  return {
    id: 'emp-1', email: 'ravi@example.com', phone: '9876543210', type: 'field-officer',
    doj: '2026-01-01T00:00:00.000Z', status: 'active', user: 'u-1', tenant: 't-1',
    bankDetails: { accountHolderName: 'Ravi Kumar', accountNumber: '', ifscCode: '', bankName: 'HDFC', branch: '' },
    profile: { firstName: 'Ravi', lastName: '', fatherName: '', bloodGroup: 'O+' },
    createdAt: '', updatedAt: '',
    ...overrides,
  } as EmployeeEntity
}

function renderEditor(employee: EmployeeEntity) {
  return render(
    <MemoryRouter>
      <EditEmployeeEditor employee={employee} />
    </MemoryRouter>,
  )
}

describe('EditEmployeeEditor', () => {
  const mutateAsync = vi.fn<(payload: UpdateEmployeePayload) => Promise<void>>(async () => {})

  beforeEach(() => {
    vi.resetAllMocks()
    mutateAsync.mockImplementation(async () => {})
    vi.mocked(useUpdateEmployee).mockReturnValue({ mutateAsync, isPending: false, isError: false, isSuccess: false, error: null, reset: vi.fn() } as never)
  })

  it('saving without touching bankDetails/profile strips their pre-existing blank sub-fields to undefined, not \'\' — a stale \'\' would 400 against the backend\'s min(1) optional fields', async () => {
    const user = userEvent.setup()
    renderEditor(employeeFixture())

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    const payload = mutateAsync.mock.calls[0][0]
    expect(payload.bankDetails).toEqual({ accountHolderName: 'Ravi Kumar', accountNumber: undefined, ifscCode: undefined, bankName: 'HDFC', branch: undefined })
    expect(payload.profile).toEqual({ firstName: 'Ravi', lastName: undefined, fatherName: undefined, bloodGroup: 'O+' })
  })

  it('editing the phone field includes the new value in the submitted payload', async () => {
    const user = userEvent.setup()
    renderEditor(employeeFixture())

    const phoneInput = screen.getByLabelText('Phone')
    await user.clear(phoneInput)
    await user.type(phoneInput, '9123456780')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(mutateAsync.mock.calls[0][0].phone).toBe('9123456780')
  })

  it('saving an employee whose profile.dob is null (the real API shape for anyone onboarded without a DOB) still submits — a raw null would otherwise fail z.string().optional() and silently block every field on the form', async () => {
    const user = userEvent.setup()
    renderEditor(employeeFixture({ profile: { firstName: 'Ravi', lastName: '', fatherName: '', bloodGroup: 'O+', dob: null } }))

    const branchInput = screen.getByLabelText('Branch')
    await user.type(branchInput, 'MG Road')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(mutateAsync.mock.calls[0][0].bankDetails).toEqual(expect.objectContaining({ branch: 'MG Road' }))
  })

  it('a full ISO datetime profile.dob (the real API shape after any save) is truncated to YYYY-MM-DD before reaching DatePicker — a raw ISO string there crashes date-fns\'s format() with "Invalid time value"', async () => {
    renderEditor(employeeFixture({ profile: { firstName: 'Ravi', lastName: '', fatherName: '', bloodGroup: 'O+', dob: '2026-01-01T00:00:00.000Z' } }))

    // date-stub order: doj, dol, profile.dob — DatePicker is stubbed here (no date-fns call), so
    // asserting the value it receives is the real proof, not just that render didn't throw.
    const dobInput = screen.getAllByLabelText('date-stub')[2]
    expect(dobInput).toHaveValue('2026-01-01')
  })

  it('rapid double-submit fires only one PUT — a synchronous ref guard blocks the second call while the first is still pending', async () => {
    let resolveMutation!: () => void
    const deferredMutateAsync = vi.fn(() => new Promise<void>((resolve) => { resolveMutation = resolve }))
    vi.mocked(useUpdateEmployee).mockReturnValue({ mutateAsync: deferredMutateAsync, isPending: false, isError: false, isSuccess: false, error: null, reset: vi.fn() } as never)

    renderEditor(employeeFixture())
    const form = document.querySelector('form')!

    await act(async () => {
      fireEvent.submit(form)
      fireEvent.submit(form)
      // Let both submit handlers' microtask chains reach the mutateAsync call before asserting —
      // the mutation itself stays pending (deferredMutateAsync never resolves here), so if the
      // guard failed, the second submit would already have called it a second time by now.
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(deferredMutateAsync).toHaveBeenCalledTimes(1)

    // Resolve and flush so the first call's own finally block runs cleanly, not left dangling.
    await act(async () => {
      resolveMutation()
      await Promise.resolve()
    })
  })
})
