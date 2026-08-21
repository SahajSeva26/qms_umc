import { Controller } from 'react-hook-form'
import type { Control, FieldErrors, FieldValues, Path, UseFormRegister } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import FieldLabel from '@/components/ui/FieldLabel'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Shared between CreateRoleEditor/EditRoleEditor — see RoleDetailsSection.tsx's
// own comment for why this is generic over the caller's form-values type
// instead of widened to RHF's most-general FieldValues. userEmail/userPassword
// (create-only) and userStatus (edit-only) are optional here since only ONE
// of CreateRoleFormValues/UpdateRoleFormValues declares each — this section
// only actually registers them behind the matching `mode` check at render time.
interface RoleUserFields {
  userFirstName: string
  userLastName: string
  userEmail?: string
  userPassword?: string
  userPhone: string
  userGender: '' | 'male' | 'female' | 'other'
  userStatus?: '' | 'active' | 'inactive' | 'suspended' | 'deleted'
}

interface RoleUserSectionProps<TFormValues extends FieldValues & RoleUserFields> {
  mode: 'create' | 'edit'
  register: UseFormRegister<TFormValues>
  control: Control<TFormValues>
  errors: FieldErrors<TFormValues>
  touchedFields: Partial<Record<Path<TFormValues>, boolean>>
  userEmail?: string
}

const RoleUserSection = <TFormValues extends FieldValues & RoleUserFields>({
  mode,
  register,
  control,
  errors,
  touchedFields,
  userEmail,
}: RoleUserSectionProps<TFormValues>) => {
  const isCreateMode = mode === 'create'

  const field = <K extends keyof RoleUserFields>(name: K) => name as unknown as Path<TFormValues>
  const fieldError = (name: keyof RoleUserFields) => errors[field(name)]
  const fieldTouched = (name: keyof RoleUserFields) => touchedFields[field(name)]

  return (
    <div className="rounded-xl border p-5 mb-5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
      <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--qms-text)' }}>
        {isCreateMode ? 'User account' : 'Bound user'}
      </h2>
      <p className="text-[12px] mb-4" style={{ color: 'var(--qms-text-muted)' }}>
        {isCreateMode
          ? 'A role binds exactly one user — creating a role registers that user in the same step.'
          : 'Edit the user bound to this role. Email cannot be changed here.'}
      </p>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel htmlFor="userFirstName">First name</FieldLabel>
            <Input id="userFirstName" type="text" {...register(field('userFirstName'))} />
            {fieldTouched('userFirstName') && fieldError('userFirstName') && (
              <p className="text-xs text-danger mt-1.5">{fieldError('userFirstName')?.message as string}</p>
            )}
          </div>
          <div>
            <FieldLabel htmlFor="userLastName">Last name</FieldLabel>
            <Input id="userLastName" type="text" {...register(field('userLastName'))} />
          </div>
        </div>

        {isCreateMode && (
          <>
            <div>
              <FieldLabel htmlFor="userEmail">Email</FieldLabel>
              <Input id="userEmail" type="email" {...register(field('userEmail'))} />
              {fieldTouched('userEmail') && fieldError('userEmail') && (
                <p className="text-xs text-danger mt-1.5">{fieldError('userEmail')?.message as string}</p>
              )}
            </div>
            <div>
              <FieldLabel htmlFor="userPassword">Password</FieldLabel>
              <Input id="userPassword" type="password" {...register(field('userPassword'))} />
              {fieldTouched('userPassword') && fieldError('userPassword') && (
                <p className="text-xs text-danger mt-1.5">{fieldError('userPassword')?.message as string}</p>
              )}
            </div>
          </>
        )}

        {!isCreateMode && userEmail && (
          <div>
            <FieldLabel>Email</FieldLabel>
            <div className="text-[13px] rounded-lg border px-3 py-2" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}>
              {userEmail}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel htmlFor="userPhone">Phone</FieldLabel>
            <Input id="userPhone" type="text" placeholder="Optional" disabled={!isCreateMode} {...register(field('userPhone'))} />
          </div>
          <div>
            <FieldLabel htmlFor="userGender">Gender</FieldLabel>
            <Controller
              control={control}
              name={field('userGender')}
              render={({ field: genderField }) => (
                <Select
                  key={(genderField.value as string) || 'empty'}
                  value={(genderField.value as string) || undefined}
                  onValueChange={(v) => genderField.onChange(v ?? '')}
                >
                  <SelectTrigger id="userGender" className="w-full">
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

        {!isCreateMode && (
          <div>
            <FieldLabel htmlFor="userStatus">User status</FieldLabel>
            <Controller
              control={control}
              name={field('userStatus')}
              render={({ field: statusField }) => (
                <Select
                  key={(statusField.value as string) || 'empty'}
                  value={(statusField.value as string) || undefined}
                  onValueChange={(v) => statusField.onChange(v ?? '')}
                >
                  <SelectTrigger id="userStatus" className="w-full">
                    <SelectValue placeholder="Select user status">
                      {(v: string) => {
                        const labels: Record<string, string> = { active: 'Active', inactive: 'Inactive', suspended: 'Suspended', deleted: 'Deleted' }
                        return labels[v] ?? 'Select user status'
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="deleted">Deleted</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default RoleUserSection
