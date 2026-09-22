import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import EmployeeFieldsSection from './EmployeeFieldsSection'
import { useEmployeeFieldsResolver, EMPTY_EMPLOYEE_FIELDS_VALUES } from '@/features/access-management/employee/employeeForm'
import type { EmployeeFieldsValues } from '@/features/access-management/employee/schemas/employee.schemas'

vi.mock('@/components/ui/DatePicker', () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input aria-label="date-stub" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}))

vi.mock('@/components/widgets/location-picker/LocationPicker', () => ({ default: () => null }))
vi.mock('@/components/widgets/location-picker/LocationAddressFields', () => ({ default: () => null }))

function Harness({ defaultValues, onSubmit }: { defaultValues: EmployeeFieldsValues; onSubmit: (v: EmployeeFieldsValues) => void }) {
  const { resolver, parsePayload } = useEmployeeFieldsResolver()
  const { register, handleSubmit, control, formState: { errors } } = useForm<EmployeeFieldsValues>({
    resolver, mode: 'onChange', defaultValues,
  })
  return (
    <form onSubmit={handleSubmit(async (values) => onSubmit(await parsePayload(values)))}>
      <EmployeeFieldsSection mode="edit" register={register} control={control} errors={errors} showErrors />
      <button type="submit">Submit</button>
    </form>
  )
}

describe('EmployeeFieldsSection', () => {
  it('a profile-only edit (e.g. just bloodGroup) submits only the changed top-level profile keys, leaving other profile fields untouched', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<Harness defaultValues={{ ...EMPTY_EMPLOYEE_FIELDS_VALUES, doj: '2026-01-01', profile: { fatherName: 'Richard' } }} onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Blood group'), 'O+')
    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ profile: expect.objectContaining({ fatherName: 'Richard', bloodGroup: 'O+' }) }))
  })

  it('submits the full bankDetails object on any change, not a sparse patch', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(
      <Harness
        defaultValues={{ ...EMPTY_EMPLOYEE_FIELDS_VALUES, doj: '2026-01-01', bankDetails: { accountHolderName: 'Ravi Kumar', bankName: 'HDFC' } }}
        onSubmit={onSubmit}
      />,
    )

    await user.type(screen.getByLabelText('Account number'), '123456789012')
    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      bankDetails: expect.objectContaining({ accountHolderName: 'Ravi Kumar', bankName: 'HDFC', accountNumber: '123456789012' }),
    }))
  })

  it('leaving Salary and the DA-rule value blank does not block submission (the NaN-from-empty-number-input regression)', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<Harness defaultValues={{ ...EMPTY_EMPLOYEE_FIELDS_VALUES, doj: '2026-01-01' }} onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ salary: undefined, daRule: undefined }))
  })

  it('date fields render via the shared DatePicker (stubbed here), not a bare text input', () => {
    render(<Harness defaultValues={{ ...EMPTY_EMPLOYEE_FIELDS_VALUES, doj: '2026-01-01' }} onSubmit={vi.fn()} />)
    expect(screen.getAllByLabelText('date-stub').length).toBeGreaterThan(0)
  })

  it('a manually-typed address with no coordinates (no map pin picked) fails validation with a useful error, matching the backend\'s required coordinates', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    // RHF's live form value follows the raw, pre-validation LocationValue shape (coordinates
    // optional) — employeeFieldsSchema's stricter parsed-output type only applies post-submit.
    const locationWithNoCoordinates = { addressLine1: '12 MG Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400058' } as EmployeeFieldsValues['location']
    render(
      <Harness
        defaultValues={{ ...EMPTY_EMPLOYEE_FIELDS_VALUES, doj: '2026-01-01', location: locationWithNoCoordinates }}
        onSubmit={onSubmit}
      />,
    )

    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(await screen.findByText(/pick a location on the map/i)).toBeInTheDocument()
  })

  it('a location with real coordinates passes validation and submits', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(
      <Harness
        defaultValues={{
          ...EMPTY_EMPLOYEE_FIELDS_VALUES, doj: '2026-01-01',
          location: { addressLine1: '12 MG Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400058', coordinates: [72.8777, 19.076] },
        }}
        onSubmit={onSubmit}
      />,
    )

    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      location: expect.objectContaining({ coordinates: [72.8777, 19.076] }),
    }))
  })

  it('phone is editable in edit mode and is included in the submitted payload', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<Harness defaultValues={{ ...EMPTY_EMPLOYEE_FIELDS_VALUES, doj: '2026-01-01', phone: '9876543210' }} onSubmit={onSubmit} />)

    const phoneInput = screen.getByLabelText('Phone')
    await user.clear(phoneInput)
    await user.type(phoneInput, '9123456780')
    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ phone: '9123456780' }))
  })

  it('a null profile.dob (the real API shape for a DOB-less employee) fails validation with a visible error, not a silent no-op', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    // Mirrors the real API response shape for an employee onboarded without a DOB — RHF's live
    // form state can hold this before employeeFieldsSchema's z.string().optional() rejects it.
    const profileWithNullDob = { fatherName: 'Richard', dob: null } as unknown as EmployeeFieldsValues['profile']
    render(
      <Harness
        defaultValues={{ ...EMPTY_EMPLOYEE_FIELDS_VALUES, doj: '2026-01-01', profile: profileWithNullDob }}
        onSubmit={onSubmit}
      />,
    )

    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(await screen.findByText(/expected string, received null/i)).toBeInTheDocument()
  })

  it('a daRule with a type picked but no value fails validation with a visible error on the value input', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<Harness defaultValues={{ ...EMPTY_EMPLOYEE_FIELDS_VALUES, doj: '2026-01-01' }} onSubmit={onSubmit} />)

    const [, daRuleTypeTrigger] = screen.getAllByRole('combobox')
    await user.click(daRuleTypeTrigger)
    await user.click(await screen.findByRole('option', { name: 'Fixed' }))
    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(await screen.findByText(/a value is required for the dearness allowance/i)).toBeInTheDocument()
  })
})
