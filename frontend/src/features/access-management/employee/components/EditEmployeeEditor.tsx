import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { FiArrowLeft } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import MutationStatusBanner from '@/components/ui/MutationStatusBanner'
import { EMPLOYEE_ROUTES } from '@/features/access-management/employee/employee.routes'
import { useUpdateEmployee } from '@/features/access-management/employee/hooks/useUpdateEmployee'
import { useEmployeeFieldsResolver, dropBlankStrings } from '@/features/access-management/employee/employeeForm'
import type { BankDetails, EmployeeProfile } from '@/types/accessManagement.types'
import type { LocationValue } from '@/types/location.types'
import EmployeeFieldsSection from '@/features/access-management/employee/components/EmployeeFieldsSection'
import EmployeeStatusPill from '@/features/access-management/employee/components/EmployeeStatusPill'
import type { EmployeeFieldsValues } from '@/features/access-management/employee/schemas/employee.schemas'
import type { EmployeeEntity, EmployeePopulatedTenant, EmployeePopulatedUser } from '@/types/accessManagement.types'

interface EditEmployeeEditorProps {
  employee: EmployeeEntity
}

const EditEmployeeEditor = ({ employee }: EditEmployeeEditorProps) => {
  const navigate = useNavigate()
  const { resolver, parsePayload } = useEmployeeFieldsResolver()
  const updateEmployee = useUpdateEmployee(employee.id)
  // Synchronous guard against a double-click firing two PUTs before isPending re-renders onto
  // the button — mirrors MoveInvoiceStageDialog.tsx's identical pattern.
  const submittingRef = useRef(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<EmployeeFieldsValues>({
    resolver,
    mode: 'onChange',
    defaultValues: {
      phone: employee.phone,
      doj: employee.doj.slice(0, 10),
      dol: employee.dol?.slice(0, 10) ?? '',
      reason: employee.reason ?? '',
      status: employee.status,
      salary: employee.salary,
      daRule: employee.daRule,
      aadharNumber: employee.aadharNumber ?? '',
      panNumber: employee.panNumber ?? '',
      bankDetails: employee.bankDetails,
      location: employee.location,
      // profile.dob comes back as a full ISO datetime (or null, for anyone onboarded without one)
      // — DatePicker needs a bare YYYY-MM-DD, same as doj/dol above.
      profile: employee.profile ? { ...employee.profile, dob: employee.profile.dob?.slice(0, 10) ?? undefined } : employee.profile,
    },
  })

  const onSubmit = async (values: EmployeeFieldsValues) => {
    if (submittingRef.current) return
    submittingRef.current = true
    try {
      const parsed = await parsePayload(values)
      try {
        await updateEmployee.mutateAsync({
          phone: parsed.phone,
          doj: parsed.doj,
          dol: parsed.dol || undefined,
          reason: parsed.reason || undefined,
          status: parsed.status || undefined,
          salary: parsed.salary,
          // parsed.daRule already passed employeeFieldsSchema's .refine() (value is a real number
          // whenever daRule itself is present) — narrow the type the same way toEmployeeFieldsPayload does.
          daRule: parsed.daRule ? { type: parsed.daRule.type, value: parsed.daRule.value! } : undefined,
          aadharNumber: parsed.aadharNumber || undefined,
          panNumber: parsed.panNumber || undefined,
          // Replaced wholesale server-side — blank sub-fields must be stripped to undefined, since
          // the backend's optional string fields are min(1) and a bare '' 400s.
          bankDetails: dropBlankStrings<BankDetails>(parsed.bankDetails),
          location: dropBlankStrings<LocationValue>(parsed.location),
          // Merged one level deep server-side, EXCEPT profilePicture — a url-only submission there
          // would silently drop an existing thumbnail since it isn't separately merged.
          profile: dropBlankStrings<EmployeeProfile>(parsed.profile),
        })
      } catch {
        // MutationStatusBanner renders the mutation error.
      }
    } finally {
      submittingRef.current = false
    }
  }

  const userValue = employee.user as EmployeePopulatedUser | string
  const tenantValue = employee.tenant as EmployeePopulatedTenant | string
  const userName = typeof userValue !== 'string' ? `${userValue.firstName} ${userValue.lastName ?? ''}`.trim() : undefined
  const tenantName = typeof tenantValue !== 'string' ? tenantValue.name : undefined

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate(EMPLOYEE_ROUTES.EMPLOYEES)}
        className="flex items-center gap-1.5 text-[13px] font-semibold mb-5 transition-colors hover:opacity-80"
        style={{ color: 'var(--qms-text-soft)' }}
      >
        <FiArrowLeft size={14} />
        Back to employees
      </button>

      {/* eslint-disable-next-line react-hooks/refs -- handleSubmit(onSubmit) only invokes onSubmit
          later, on an actual submit event; submittingRef.current is never read during render. */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="rounded-xl border p-5 mb-5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="text-lg font-bold truncate" style={{ color: 'var(--qms-text)' }}>
                {userName ?? employee.email}
              </div>
              <div className="text-[13px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
                {employee.email} · {employee.phone}
              </div>
              {tenantName && (
                <div className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
                  Company: {tenantName}
                </div>
              )}
            </div>
            <EmployeeStatusPill status={employee.status} />
          </div>
        </div>

        <div className="mb-5">
          <EmployeeFieldsSection mode="edit" register={register} control={control} errors={errors} showErrors />
        </div>

        <MutationStatusBanner mutation={updateEmployee} showSuccess />
        <Button type="submit" disabled={updateEmployee.isPending} className="mt-4">
          {updateEmployee.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </form>
    </div>
  )
}

export default EditEmployeeEditor
