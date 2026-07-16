import { useState } from 'react'
import { FiPlus } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateTenant } from '@/features/pbac/tenant/hooks/useCreateTenant'
import { createTenantSchema } from '@/features/pbac/tenant/schemas/tenant.schemas'
import { TENANT_ROUTES } from '@/features/pbac/tenant/tenant.routes'

// Single-step create form rendered in a Dialog modal — this is a much
// smaller payload than the CRM "New Lead" flow (`NewLeadWizard.tsx`), so a
// multi-step wizard would be overkill. Kept to the same trigger convention
// used across the app (FiPlus icon button that flips a boolean `open` state
// feeding a controlled <Dialog>), just without the step machinery.
//
// CreateTenantPayload embeds a FULL owner-user registration payload
// (RegisterOwnerPayload) — the tenant's initial admin user is created in the
// same call, so this form collects both tenant fields and owner account
// fields together.

const EMPTY_FORM = {
  code: '',
  name: '',
  description: '',
  ownerFirstName: '',
  ownerLastName: '',
  ownerEmail: '',
  ownerPassword: '',
  ownerPhone: '',
  ownerGender: '' as '' | 'male' | 'female' | 'other',
}

const CreateTenantDialog = () => {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const navigate = useNavigate()
  const createTenant = useCreateTenant()

  const setField = <K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const resetAndClose = () => {
    setForm(EMPTY_FORM)
    setFormError(null)
    createTenant.reset()
    setOpen(false)
  }

  const handleSubmit = () => {
    const payload = {
      code: form.code,
      name: form.name,
      description: form.description || undefined,
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
        <FiPlus size={14} /> New Tenant
      </Button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create tenant</DialogTitle>
          <DialogDescription>
            Sets up the tenant and registers its initial admin user in one step.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <h3 className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              Tenant details
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
            </div>
          </div>

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

          {formError && <div className="text-xs text-danger">{formError}</div>}

          {createTenant.isError && (
            <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
              Failed to create tenant. Please try again.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose} disabled={createTenant.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createTenant.isPending}>
            {createTenant.isPending ? 'Creating…' : 'Create tenant'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CreateTenantDialog
