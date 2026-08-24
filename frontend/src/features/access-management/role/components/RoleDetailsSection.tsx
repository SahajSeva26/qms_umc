import { Controller } from 'react-hook-form'
import type { Control, FieldErrors, FieldValues, Path, UseFormRegister } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import FieldLabel from '@/components/ui/FieldLabel'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { RoleStatus, RoleTypeEntity, RoleEntity } from '@/types/accessManagement.types'
import type { DivisionEntity } from '@/types/crm.types'

// Generic over the caller's form-values type (rather than RHF's FieldValues)
// so register()/control still type-check field name literals without casts.
interface RoleDetailsFields {
  code?: string
  name: string
  description: string
  roleType: string
  division?: string
  supervisor?: string
  status?: RoleStatus | ''
}

interface RoleDetailsSectionProps<TFormValues extends FieldValues & RoleDetailsFields> {
  mode: 'create' | 'edit'
  register: UseFormRegister<TFormValues>
  control: Control<TFormValues>
  errors: FieldErrors<TFormValues>
  touchedFields: Partial<Record<Path<TFormValues>, boolean>>
  roleTypeOptions: RoleTypeEntity[]
  roleTypeName?: string
  tenant: string
  needsDivision: boolean
  needsSupervisor: boolean
  divisions: DivisionEntity[]
  division: string
  supervisorCandidates: RoleEntity[]
  isLoadingSupervisors: boolean
  onRoleTypeChange?: () => void
  onDivisionChange?: () => void
}

const RoleDetailsSection = <TFormValues extends FieldValues & RoleDetailsFields>({
  mode,
  register,
  control,
  errors,
  touchedFields,
  roleTypeOptions,
  roleTypeName,
  tenant,
  needsDivision,
  needsSupervisor,
  divisions,
  division,
  supervisorCandidates,
  isLoadingSupervisors,
  onRoleTypeChange,
  onDivisionChange,
}: RoleDetailsSectionProps<TFormValues>) => {
  const isCreateMode = mode === 'create'

  // TS can't verify a bare string literal against abstract generic Path<T>,
  // even though TFormValues extends RoleDetailsFields — narrow cast per field name.
  const field = <K extends keyof RoleDetailsFields>(name: K) => name as unknown as Path<TFormValues>
  const fieldError = (name: keyof RoleDetailsFields) => errors[field(name)]
  const fieldTouched = (name: keyof RoleDetailsFields) => touchedFields[field(name)]

  return (
    <div className="rounded-xl border p-5 mb-5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
      <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--qms-text)' }}>
        {isCreateMode ? 'Details' : 'Edit role'}
      </h2>

      <div className="space-y-4">
        {isCreateMode && (
          <div>
            <FieldLabel htmlFor="code">Code</FieldLabel>
            <Input id="code" type="text" placeholder="e.g. site-manager-john" {...register(field('code'))} />
            {fieldTouched('code') && fieldError('code') && <p className="text-xs text-danger mt-1.5">{fieldError('code')?.message as string}</p>}
          </div>
        )}

        <div>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input id="name" type="text" {...register(field('name'))} />
          {fieldTouched('name') && fieldError('name') && <p className="text-xs text-danger mt-1.5">{fieldError('name')?.message as string}</p>}
        </div>

        <div>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea id="description" placeholder="Optional" {...register(field('description'))} />
        </div>

        <div>
          <FieldLabel htmlFor="roleType">Role Type</FieldLabel>
          <Controller
            control={control}
            name={field('roleType')}
            render={({ field: rtField }) => (
              <Select
                key={(rtField.value as string) || 'empty'}
                value={(rtField.value as string) || undefined}
                onValueChange={(v) => {
                  rtField.onChange(v ?? '')
                  onRoleTypeChange?.()
                }}
                disabled={!tenant}
              >
                <SelectTrigger id="roleType" className="w-full">
                  <SelectValue placeholder={tenant ? 'Select role type' : 'Select a company first'}>
                    {(v: string) => {
                      const rt = roleTypeOptions.find((rt) => rt.id === v)
                      if (rt) return `${rt.name} (${rt.code})`
                      if (roleTypeName) return roleTypeName
                      return tenant ? 'Select role type' : 'Select a company first'
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {roleTypeOptions.map((rt) => (
                    <SelectItem key={rt.id} value={rt.id}>
                      {rt.name} ({rt.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {fieldTouched('roleType') && fieldError('roleType') && (
            <p className="text-xs text-danger mt-1.5">{fieldError('roleType')?.message as string}</p>
          )}
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
            Scoped to the same company this role belongs to.
          </p>
        </div>

        {isCreateMode && needsDivision && (
          <div>
            <FieldLabel>Division</FieldLabel>
            <Controller
              control={control}
              name={field('division')}
              render={({ field: divisionField }) => (
                <Select
                  key={(divisionField.value as string) || 'empty'}
                  value={(divisionField.value as string) || undefined}
                  onValueChange={(v) => {
                    divisionField.onChange(v ?? '')
                    onDivisionChange?.()
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select division">
                      {(v: string) => divisions.find((d) => d.id === v)?.name ?? 'Select division'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {divisions.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        )}

        {isCreateMode && needsSupervisor && (
          <div>
            <FieldLabel>Supervisor</FieldLabel>
            <Controller
              control={control}
              name={field('supervisor')}
              render={({ field: supervisorField }) => (
                <Select
                  key={(supervisorField.value as string) || 'empty'}
                  value={(supervisorField.value as string) || undefined}
                  onValueChange={(v) => supervisorField.onChange(v ?? '')}
                  disabled={!division}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={!division ? 'Select a division first' : isLoadingSupervisors ? 'Loading…' : 'Select supervisor'}>
                      {(v: string) => {
                        const s = supervisorCandidates.find((r) => r.id === v)
                        return s ? `${s.name} (${s.code})` : 'Select supervisor'
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {supervisorCandidates.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {division && !isLoadingSupervisors && supervisorCandidates.length === 0 && (
              <p className="text-[11px] mt-1.5 text-danger">
                No eligible supervisor exists in this division yet — create one first.
              </p>
            )}
          </div>
        )}

        {!isCreateMode && (
          <div>
            <FieldLabel htmlFor="status">Status</FieldLabel>
            <Controller
              control={control}
              name={field('status')}
              render={({ field: statusField }) => (
                <Select
                  key={(statusField.value as string) || 'empty'}
                  value={(statusField.value as string) || undefined}
                  onValueChange={(v) => statusField.onChange(v as RoleStatus)}
                >
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue placeholder="Select status">
                      {(v: string) => (v === 'active' ? 'Active' : v === 'inactive' ? 'Inactive' : 'Select status')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
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

export default RoleDetailsSection
