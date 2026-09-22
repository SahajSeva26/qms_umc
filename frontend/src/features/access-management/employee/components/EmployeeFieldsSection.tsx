import { useState } from 'react'
import { Controller } from 'react-hook-form'
import type { Control, FieldErrors, FieldValues, Path, UseFormRegister } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import FieldLabel from '@/components/ui/FieldLabel'
import DatePicker from '@/components/ui/DatePicker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import LocationPicker from '@/components/widgets/location-picker/LocationPicker'
import LocationAddressFields from '@/components/widgets/location-picker/LocationAddressFields'
import type { LocationValue } from '@/types/location.types'
import type { EmployeeFieldsValues } from '@/features/access-management/employee/schemas/employee.schemas'

interface EmployeeFieldsSectionProps<TFormValues extends FieldValues & EmployeeFieldsValues> {
  mode: 'create' | 'edit'
  register: UseFormRegister<TFormValues>
  control: Control<TFormValues>
  errors: FieldErrors<TFormValues>
  /** This section is always its containing form's own step (never split further), so a single
   *  "has this step been attempted" flag is enough — no per-field touched tracking needed. */
  showErrors: boolean
}

// Shared by both create-wizard modes and EditEmployeeEditor — user/email/tenant/type are each
// caller's own concern (see employee.schemas.ts's comment); phone is rendered here, edit-mode only.
const EmployeeFieldsSection = <TFormValues extends FieldValues & EmployeeFieldsValues>({
  mode,
  register,
  control,
  errors,
  showErrors,
}: EmployeeFieldsSectionProps<TFormValues>) => {
  const [locationHint, setLocationHint] = useState<string | null>(null)

  const field = <K extends keyof EmployeeFieldsValues>(name: K) => name as unknown as Path<TFormValues>
  const fieldError = (name: keyof EmployeeFieldsValues) => errors[field(name)]
  // location itself is required to be a valid object once any part of it is filled in, but the
  // specific, useful complaint here is almost always "no coordinates" — the map/pin error path.
  const locationError = errors[field('location')]
  const coordinatesError = (locationError as { coordinates?: { message?: string } } | undefined)?.coordinates
  const locationErrorMessage = (coordinatesError?.message as string | undefined) ?? (locationError?.message as string | undefined)
  // The refine's error path is ['value'], so the message lives at daRule.value, not daRule itself.
  const daRuleValueError = (errors[field('daRule')] as { value?: { message?: string } } | undefined)?.value

  return (
    <div className="space-y-5">
      <div className="rounded-xl border p-5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
        <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--qms-text)' }}>Employment</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Date of joining</FieldLabel>
              <Controller
                control={control}
                name={field('doj')}
                render={({ field: dojField }) => (
                  <DatePicker value={(dojField.value as string) || ''} onChange={dojField.onChange} className="w-full" />
                )}
              />
              {showErrors && fieldError('doj') && (
                <p className="text-xs text-danger mt-1.5">{fieldError('doj')?.message as string}</p>
              )}
            </div>
            <div>
              <FieldLabel>Date of leaving</FieldLabel>
              <Controller
                control={control}
                name={field('dol')}
                render={({ field: dolField }) => (
                  <DatePicker value={(dolField.value as string) || ''} onChange={dolField.onChange} placeholder="Optional" className="w-full" />
                )}
              />
            </div>
          </div>

          {mode === 'edit' && (
            <>
              <div>
                <FieldLabel htmlFor="phone">Phone</FieldLabel>
                <Input id="phone" type="text" {...register(field('phone'))} />
                {showErrors && fieldError('phone') && (
                  <p className="text-xs text-danger mt-1.5">{fieldError('phone')?.message as string}</p>
                )}
              </div>
              <div>
                <FieldLabel htmlFor="status">Status</FieldLabel>
                <Controller
                  control={control}
                  name={field('status')}
                  render={({ field: statusField }) => (
                    <Select
                      key={(statusField.value as string) || 'empty'}
                      value={(statusField.value as string) || undefined}
                      onValueChange={statusField.onChange}
                    >
                      <SelectTrigger id="status" className="w-full">
                        <SelectValue placeholder="Select status">
                          {(v: string) => ({ active: 'Active', inactive: 'Inactive', terminated: 'Terminated' }[v] ?? 'Select status')}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="terminated">Terminated</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <FieldLabel htmlFor="reason">Reason</FieldLabel>
                <Textarea id="reason" placeholder="Optional — e.g. reason for leaving" {...register(field('reason'))} />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border p-5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
        <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--qms-text)' }}>Compensation</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel htmlFor="salary">Salary</FieldLabel>
              <Input id="salary" type="number" placeholder="Optional" {...register(field('salary'), { valueAsNumber: true })} />
              {showErrors && fieldError('salary') && (
                <p className="text-xs text-danger mt-1.5">{fieldError('salary')?.message as string}</p>
              )}
            </div>
            <div>
              <FieldLabel htmlFor="daRuleValue">Dearness allowance</FieldLabel>
              <div className="flex gap-2">
                <Controller
                  control={control}
                  name={'daRule.type' as Path<TFormValues>}
                  render={({ field: typeField }) => (
                    <Select
                      key={(typeField.value as string) || 'empty'}
                      value={(typeField.value as string) || undefined}
                      onValueChange={typeField.onChange}
                    >
                      <SelectTrigger className="w-28 shrink-0">
                        <SelectValue placeholder="Type">
                          {(v: string) => (v === 'fixed' ? 'Fixed' : v === 'percentage' ? '% of salary' : 'Type')}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed</SelectItem>
                        <SelectItem value="percentage">% of salary</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <Input
                  id="daRuleValue"
                  type="number"
                  placeholder="Value"
                  {...register('daRule.value' as Path<TFormValues>, { valueAsNumber: true })}
                />
              </div>
              {showErrors && daRuleValueError && (
                <p className="text-xs text-danger mt-1.5">{daRuleValueError.message}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border p-5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
        <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--qms-text)' }}>KYC</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel htmlFor="aadharNumber">Aadhaar number</FieldLabel>
            <Input id="aadharNumber" type="text" placeholder="Optional — 12 digits" {...register(field('aadharNumber'))} />
            {showErrors && fieldError('aadharNumber') && (
              <p className="text-xs text-danger mt-1.5">{fieldError('aadharNumber')?.message as string}</p>
            )}
          </div>
          <div>
            <FieldLabel htmlFor="panNumber">PAN number</FieldLabel>
            <Input id="panNumber" type="text" placeholder="Optional" {...register(field('panNumber'))} />
            {showErrors && fieldError('panNumber') && (
              <p className="text-xs text-danger mt-1.5">{fieldError('panNumber')?.message as string}</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border p-5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
        <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--qms-text)' }}>Bank details</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel htmlFor="accountHolderName">Account holder name</FieldLabel>
              <Input id="accountHolderName" type="text" placeholder="Optional" {...register('bankDetails.accountHolderName' as Path<TFormValues>)} />
            </div>
            <div>
              <FieldLabel htmlFor="accountNumber">Account number</FieldLabel>
              <Input id="accountNumber" type="text" placeholder="Optional" {...register('bankDetails.accountNumber' as Path<TFormValues>)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel htmlFor="ifscCode">IFSC code</FieldLabel>
              <Input id="ifscCode" type="text" placeholder="Optional" {...register('bankDetails.ifscCode' as Path<TFormValues>)} />
            </div>
            <div>
              <FieldLabel htmlFor="bankName">Bank name</FieldLabel>
              <Input id="bankName" type="text" placeholder="Optional" {...register('bankDetails.bankName' as Path<TFormValues>)} />
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="branch">Branch</FieldLabel>
            <Input id="branch" type="text" placeholder="Optional" {...register('bankDetails.branch' as Path<TFormValues>)} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border p-5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
        <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--qms-text)' }}>Location</h2>
        <Controller
          control={control}
          name={field('location')}
          render={({ field: locationField }) => (
            <div className="space-y-2">
              <LocationPicker
                value={(locationField.value as LocationValue) ?? null}
                onChange={locationField.onChange}
                onLocationHintChange={setLocationHint}
                defaultCountry="India"
                countryCode="IN"
              />
              <LocationAddressFields
                value={(locationField.value as LocationValue) ?? null}
                onChange={locationField.onChange}
                defaultCountry="India"
                locationHint={locationHint}
              />
            </div>
          )}
        />
        {showErrors && locationErrorMessage && (
          <p className="text-xs text-danger mt-1.5">{locationErrorMessage}</p>
        )}
      </div>

      <div className="rounded-xl border p-5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
        <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--qms-text)' }}>Personal profile</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel htmlFor="fatherName">Father's name</FieldLabel>
            <Input id="fatherName" type="text" placeholder="Optional" {...register('profile.fatherName' as Path<TFormValues>)} />
          </div>
          <div>
            <FieldLabel htmlFor="bloodGroup">Blood group</FieldLabel>
            <Input id="bloodGroup" type="text" placeholder="Optional" {...register('profile.bloodGroup' as Path<TFormValues>)} />
          </div>
          <div>
            <FieldLabel>Date of birth</FieldLabel>
            <Controller
              control={control}
              name={'profile.dob' as Path<TFormValues>}
              render={({ field: dobField, fieldState: dobFieldState }) => (
                <>
                  <DatePicker value={(dobField.value as string) || ''} onChange={dobField.onChange} placeholder="Optional" className="w-full" />
                  {showErrors && dobFieldState.error && (
                    <p className="text-xs text-danger mt-1.5">{dobFieldState.error.message}</p>
                  )}
                </>
              )}
            />
          </div>
          <div>
            <FieldLabel htmlFor="profileGender">Gender</FieldLabel>
            <Controller
              control={control}
              name={'profile.gender' as Path<TFormValues>}
              render={({ field: genderField }) => (
                <Select
                  key={(genderField.value as string) || 'empty'}
                  value={(genderField.value as string) || undefined}
                  onValueChange={genderField.onChange}
                >
                  <SelectTrigger id="profileGender" className="w-full">
                    <SelectValue placeholder="Optional">
                      {(v: string) => (v === 'male' ? 'Male' : v === 'female' ? 'Female' : v === 'other' ? 'Other' : 'Optional')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmployeeFieldsSection
