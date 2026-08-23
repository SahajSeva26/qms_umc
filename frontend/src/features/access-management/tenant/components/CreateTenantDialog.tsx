import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { FiArrowLeft, FiPlus } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useCreateTenant } from '@/features/access-management/tenant/hooks/useCreateTenant'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useRoleTypes } from '@/features/access-management/role-type/hooks/useRoleTypes'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { createTenantSchema } from '@/features/access-management/tenant/schemas/tenant.schemas'
import { useReshapingResolver } from '@/features/access-management/hooks/useReshapingResolver'
import { TENANT_ROUTES } from '@/features/access-management/tenant/tenant.routes'
import { PLATFORM_TENANT_CODE, PLATFORM_TENANT_FETCH_LIMIT } from '@/features/access-management/accessManagement.constants'

// Two-step form: step 1 is the company's own details, step 2 is the owner
// account — the tenant's initial admin user is created in the same call.

interface TenantFormValues {
  code: string
  name: string
  description: string
  salesPerson: string
  ownerFirstName: string
  ownerLastName: string
  ownerEmail: string
  ownerPassword: string
  ownerPhone: string
  ownerGender: '' | 'male' | 'female' | 'other'
}

const EMPTY_FORM_VALUES: TenantFormValues = {
  code: '',
  name: '',
  description: '',
  salesPerson: '',
  ownerFirstName: '',
  ownerLastName: '',
  ownerEmail: '',
  ownerPassword: '',
  ownerPhone: '',
  ownerGender: '',
}

// Maps the resolver's nested owner.* error paths back to the form's flat ownerX fields.
const OWNER_FIELD_TO_FORM_FIELD: Record<string, keyof TenantFormValues> = {
  firstName: 'ownerFirstName',
  lastName: 'ownerLastName',
  email: 'ownerEmail',
  password: 'ownerPassword',
  phone: 'ownerPhone',
  gender: 'ownerGender',
}

const useTenantFormResolver = () =>
  useReshapingResolver<TenantFormValues>({
    schema: createTenantSchema,
    toPayload: (values) => ({
      code: values.code,
      name: values.name,
      description: values.description || undefined,
      salesPerson: values.salesPerson,
      owner: {
        firstName: values.ownerFirstName,
        lastName: values.ownerLastName || undefined,
        email: values.ownerEmail,
        password: values.ownerPassword,
        phone: values.ownerPhone || undefined,
        gender: values.ownerGender || undefined,
      },
    }),
    nestedFieldMaps: { owner: OWNER_FIELD_TO_FORM_FIELD },
  })

const CreateTenantDialog = () => {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  // trigger() doesn't mark fields "touched", so without this a blind Next
  // click on a blank step 1 wouldn't show errors for untouched fields.
  const [step1Attempted, setStep1Attempted] = useState(false)
  const navigate = useNavigate()
  const createTenant = useCreateTenant()
  const resolver = useTenantFormResolver()

  const {
    register,
    handleSubmit,
    control,
    reset,
    trigger,
    formState: { errors, touchedFields, isSubmitted },
  } = useForm<TenantFormValues>({
    resolver,
    mode: 'onChange',
    defaultValues: EMPTY_FORM_VALUES,
  })

  // Sales rep picker is scoped to the platform tenant; queries only fire
  // once the dropdown has been opened, not just whenever the dialog is open.
  const [salesRepPickerOpened, setSalesRepPickerOpened] = useState(false)
  const salesRepQueriesEnabled = open && salesRepPickerOpened

  const { data: platformTenantData, isError: platformTenantErrored } = useTenants({ type: 'platform', status: 'active', limit: PLATFORM_TENANT_FETCH_LIMIT }, salesRepQueriesEnabled)
  const platformTenant = platformTenantData?.data?.items.find((t) => t.type === 'platform' || t.code === PLATFORM_TENANT_CODE)

  const { data: salesRepTypeData, isLoading: roleTypeLoading, isError: roleTypeErrored } = useRoleTypes({ code: 'sales-rep', status: 'active' }, salesRepQueriesEnabled)
  const salesRepTypeId = salesRepTypeData?.data?.items[0]?.id

  const { data: salesRepRoleData, isLoading: salesRepsLoading, isError: salesRepsErrored } = useRoles(
    { tenant: platformTenant?.id, type: salesRepTypeId, status: 'active' },
    salesRepQueriesEnabled && !!platformTenant && !!salesRepTypeId,
  )
  const salesReps = salesRepRoleData?.data?.items ?? []
  const salesRepsBusy = roleTypeLoading || salesRepsLoading
  const salesRepsErroredOut = platformTenantErrored || roleTypeErrored || salesRepsErrored

  const fieldError = (field: keyof TenantFormValues) =>
    (touchedFields[field] || isSubmitted || step1Attempted) ? errors[field]?.message : undefined

  const resetAndClose = () => {
    reset(EMPTY_FORM_VALUES)
    setStep(0)
    setStep1Attempted(false)
    setSalesRepPickerOpened(false)
    createTenant.reset()
    setOpen(false)
  }

  // Only validates step-1 fields so step-2's still-empty owner fields don't block Next.
  const handleNext = async () => {
    setStep1Attempted(true)
    const valid = await trigger(['code', 'name', 'salesPerson'])
    if (valid) setStep(1)
  }

  const onSubmit = (values: TenantFormValues) => {
    const payload = {
      code: values.code,
      name: values.name,
      description: values.description || undefined,
      salesPerson: values.salesPerson,
      owner: {
        firstName: values.ownerFirstName,
        lastName: values.ownerLastName || undefined,
        email: values.ownerEmail,
        password: values.ownerPassword,
        phone: values.ownerPhone || undefined,
        gender: values.ownerGender || undefined,
      },
    }
    createTenant.mutate(payload, {
      onSuccess: (res) => {
        resetAndClose()
        if (res.data?.id) {
          navigate(TENANT_ROUTES.TENANT_DETAIL.replace(':id', res.data.id))
        }
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : resetAndClose())}>
      <Button
        onClick={() => setOpen(true)}
        className="text-white shrink-0"
        style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
      >
        <FiPlus size={14} /> New Client
      </Button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create company</DialogTitle>
          <DialogDescription>
            {step === 0 ? 'Step 1 of 2 — company details.' : 'Step 2 of 2 — registers the company’s initial admin user.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {step === 0 && (
              <div>
                <h3 className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                  Company details
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="tenantCode" className="text-xs mb-1.5">
                      Code
                    </Label>
                    <Input id="tenantCode" type="text" placeholder="e.g. acme-pharma" {...register('code')} />
                    {fieldError('code') && <p className="text-[11px] mt-1 text-danger">{fieldError('code')}</p>}
                  </div>
                  <div>
                    <Label htmlFor="tenantName" className="text-xs mb-1.5">
                      Name
                    </Label>
                    <Input id="tenantName" type="text" placeholder="e.g. Acme Pharma" {...register('name')} />
                    {fieldError('name') && <p className="text-[11px] mt-1 text-danger">{fieldError('name')}</p>}
                  </div>
                  <div>
                    <Label htmlFor="tenantDescription" className="text-xs mb-1.5">
                      Description
                    </Label>
                    <Textarea id="tenantDescription" placeholder="Optional" {...register('description')} />
                  </div>
                  <div>
                    <Label htmlFor="salesPerson" className="text-xs mb-1.5">
                      Sales rep
                    </Label>
                    <Controller
                      control={control}
                      name="salesPerson"
                      render={({ field }) => (
                        <Select
                          key={field.value || 'empty'}
                          value={field.value || undefined}
                          onValueChange={field.onChange}
                          onOpenChange={(next) => next && setSalesRepPickerOpened(true)}
                        >
                          <SelectTrigger id="salesPerson" className="w-full">
                            <SelectValue placeholder={salesRepsBusy ? 'Loading...' : 'Select sales rep...'}>
                              {(v: string) => {
                                const r = salesReps.find((role) => role.id === v)
                                return r ? `${r.name} (${r.code})` : salesRepsBusy ? 'Loading...' : 'Select sales rep...'
                              }}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {salesReps.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {fieldError('salesPerson') && <p className="text-[11px] mt-1 text-danger">{fieldError('salesPerson')}</p>}
                    {salesRepPickerOpened && salesRepsErroredOut && (
                      <p className="text-[11px] mt-1 text-danger">Couldn't load sales reps — try again.</p>
                    )}
                    {salesRepPickerOpened && !salesRepsErroredOut && !salesRepsBusy && !platformTenant && (
                      <p className="text-[11px] mt-1 text-danger">No QMS internal (platform) company found — a sales rep must belong to one.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <h3 className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                  Owner account
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="ownerFirstName" className="text-xs mb-1.5">
                        First name
                      </Label>
                      <Input id="ownerFirstName" type="text" {...register('ownerFirstName')} />
                      {fieldError('ownerFirstName') && <p className="text-[11px] mt-1 text-danger">{fieldError('ownerFirstName')}</p>}
                    </div>
                    <div>
                      <Label htmlFor="ownerLastName" className="text-xs mb-1.5">
                        Last name
                      </Label>
                      <Input id="ownerLastName" type="text" {...register('ownerLastName')} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="ownerEmail" className="text-xs mb-1.5">
                      Email
                    </Label>
                    <Input id="ownerEmail" type="email" {...register('ownerEmail')} />
                    {fieldError('ownerEmail') && <p className="text-[11px] mt-1 text-danger">{fieldError('ownerEmail')}</p>}
                  </div>
                  <div>
                    <Label htmlFor="ownerPassword" className="text-xs mb-1.5">
                      Password
                    </Label>
                    <Input id="ownerPassword" type="password" {...register('ownerPassword')} />
                    {fieldError('ownerPassword') && <p className="text-[11px] mt-1 text-danger">{fieldError('ownerPassword')}</p>}
                  </div>
                  <div>
                    <Label htmlFor="ownerPhone" className="text-xs mb-1.5">
                      Phone
                    </Label>
                    <Input id="ownerPhone" type="text" placeholder="Optional" {...register('ownerPhone')} />
                  </div>
                </div>
              </div>
            )}

            {createTenant.isError && (
              <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
                {(createTenant.error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                  'Failed to create company. Please try again.'}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            {step === 0 ? (
              <>
                <Button type="button" variant="outline" onClick={resetAndClose} disabled={createTenant.isPending}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleNext}>Next</Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => setStep(0)} disabled={createTenant.isPending}>
                  <FiArrowLeft size={14} /> Back
                </Button>
                <Button type="submit" disabled={createTenant.isPending}>
                  {createTenant.isPending ? 'Creating…' : 'Create company'}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CreateTenantDialog
