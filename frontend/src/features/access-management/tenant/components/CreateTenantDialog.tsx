import { useState } from 'react'
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
import { TENANT_ROUTES } from '@/features/access-management/tenant/tenant.routes'
import { PLATFORM_TENANT_CODE, PLATFORM_TENANT_FETCH_LIMIT } from '@/features/access-management/accessManagement.constants'
import { useScrollIntoViewOnChange } from '@/hooks/useScrollIntoViewOnChange'

// Two-step form: step 1 is the company's own details, step 2 is the owner
// account CreateTenantPayload embeds — the tenant's initial admin user is
// created in the same call.

const EMPTY_FORM = {
  code: '',
  name: '',
  description: '',
  salesPerson: '',
  ownerFirstName: '',
  ownerLastName: '',
  ownerEmail: '',
  ownerPassword: '',
  ownerPhone: '',
  ownerGender: '' as '' | 'male' | 'female' | 'other',
}

const CreateTenantDialog = () => {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const navigate = useNavigate()
  const createTenant = useCreateTenant()
  const errorRef = useScrollIntoViewOnChange<HTMLDivElement>(formError)

  // Sales rep picker, scoped to the platform ('qms') tenant since sales reps
  // are platform-side staff. Only 'sales-rep' is offered — TODO: add
  // 'sales-head' too if/when the backend accepts it as well.
  const { data: platformTenantData, isError: platformTenantErrored } = useTenants({ type: 'platform', status: 'active', limit: PLATFORM_TENANT_FETCH_LIMIT }, open)
  const platformTenant = platformTenantData?.data?.items.find((t) => t.type === 'platform' || t.code === PLATFORM_TENANT_CODE)

  const { data: salesRepTypeData, isLoading: roleTypeLoading, isError: roleTypeErrored } = useRoleTypes({ code: 'sales-rep', status: 'active' }, open)
  const salesRepTypeId = salesRepTypeData?.data?.items[0]?.id

  const { data: salesRepRoleData, isLoading: salesRepsLoading, isError: salesRepsErrored } = useRoles(
    { tenant: platformTenant?.id, type: salesRepTypeId, status: 'active' },
    open && !!platformTenant && !!salesRepTypeId,
  )
  const salesReps = salesRepRoleData?.data?.items ?? []
  const salesRepsBusy = roleTypeLoading || salesRepsLoading
  const salesRepsErroredOut = platformTenantErrored || roleTypeErrored || salesRepsErrored

  const setField = <K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const resetAndClose = () => {
    setForm(EMPTY_FORM)
    setFormError(null)
    setStep(0)
    createTenant.reset()
    setOpen(false)
  }

  // Blocks advancing with an incomplete step 1 — full validation still runs
  // via createTenantSchema on final submit.
  const handleNext = () => {
    if (!form.code.trim()) return setFormError('Company code is required')
    if (!form.name.trim()) return setFormError('Company name is required')
    if (!form.salesPerson) return setFormError('Sales rep is required')
    setFormError(null)
    setStep(1)
  }

  const handleSubmit = () => {
    const payload = {
      code: form.code,
      name: form.name,
      description: form.description || undefined,
      salesPerson: form.salesPerson,
      owner: {
        firstName: form.ownerFirstName,
        lastName: form.ownerLastName || undefined,
        email: form.ownerEmail,
        password: form.ownerPassword,
        phone: form.ownerPhone || undefined,
        gender: form.ownerGender || undefined,
      },
    }

    const result = createTenantSchema.safeParse(payload)
    if (!result.success) {
      setFormError(result.error.issues[0].message)
      return
    }

    setFormError(null)
    createTenant.mutate(result.data, {
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
                  <Input
                    id="tenantCode"
                    type="text"
                    value={form.code}
                    onChange={(e) => setField('code', e.target.value)}
                    placeholder="e.g. acme-pharma"
                  />
                </div>
                <div>
                  <Label htmlFor="tenantName" className="text-xs mb-1.5">
                    Name
                  </Label>
                  <Input
                    id="tenantName"
                    type="text"
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    placeholder="e.g. Acme Pharma"
                  />
                </div>
                <div>
                  <Label htmlFor="tenantDescription" className="text-xs mb-1.5">
                    Description
                  </Label>
                  <Textarea
                    id="tenantDescription"
                    value={form.description}
                    onChange={(e) => setField('description', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label htmlFor="salesPerson" className="text-xs mb-1.5">
                    Sales rep
                  </Label>
                  <Select key={form.salesPerson || 'empty'} value={form.salesPerson || undefined} onValueChange={(v) => setField('salesPerson', (v as string) ?? '')}>
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
                  {salesRepsErroredOut && (
                    <p className="text-[11px] mt-1 text-danger">Couldn't load sales reps — try again.</p>
                  )}
                  {!salesRepsErroredOut && !salesRepsBusy && !platformTenant && (
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
                    <Input
                      id="ownerFirstName"
                      type="text"
                      value={form.ownerFirstName}
                      onChange={(e) => setField('ownerFirstName', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ownerLastName" className="text-xs mb-1.5">
                      Last name
                    </Label>
                    <Input
                      id="ownerLastName"
                      type="text"
                      value={form.ownerLastName}
                      onChange={(e) => setField('ownerLastName', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="ownerEmail" className="text-xs mb-1.5">
                    Email
                  </Label>
                  <Input
                    id="ownerEmail"
                    type="email"
                    value={form.ownerEmail}
                    onChange={(e) => setField('ownerEmail', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="ownerPassword" className="text-xs mb-1.5">
                    Password
                  </Label>
                  <Input
                    id="ownerPassword"
                    type="password"
                    value={form.ownerPassword}
                    onChange={(e) => setField('ownerPassword', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="ownerPhone" className="text-xs mb-1.5">
                    Phone
                  </Label>
                  <Input
                    id="ownerPhone"
                    type="text"
                    value={form.ownerPhone}
                    onChange={(e) => setField('ownerPhone', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
          )}

          {formError && (
            <div ref={errorRef} className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
              {formError}
            </div>
          )}

          {createTenant.isError && (
            <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
              {(createTenant.error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to create company. Please try again.'}
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 0 ? (
            <>
              <Button variant="outline" onClick={resetAndClose} disabled={createTenant.isPending}>
                Cancel
              </Button>
              <Button onClick={handleNext}>Next</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(0)} disabled={createTenant.isPending}>
                <FiArrowLeft size={14} /> Back
              </Button>
              <Button onClick={handleSubmit} disabled={createTenant.isPending}>
                {createTenant.isPending ? 'Creating…' : 'Create company'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CreateTenantDialog
