import { useState } from 'react'
import { FiArrowLeft, FiSave } from 'react-icons/fi'
import type { DivisionTherapy } from '@/types/crm.types'
import { DIVISION_THERAPY_LABEL } from '@/types/crm.types'
import { createDivisionSchema } from '@/features/crm/divisions/schemas/division.schemas'
import { useCreateDivision } from '@/features/crm/divisions/hooks/useCreateDivision'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import ChipPicker from '@/components/ui/ChipPicker'
import { toast } from '@/components/ui/sonner'

interface CreateDivisionModalProps {
  onClose: () => void
  /** Pre-selects the Company field when opened from a specific company's scoped Divisions view (?tenant=<id>) */
  defaultTenantId?: string
}

const THERAPY_OPTIONS = Object.keys(DIVISION_THERAPY_LABEL) as DivisionTherapy[]
const GENDER_OPTIONS: { value: 'male' | 'female' | 'other'; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
]

// Create-only — editing happens on DivisionDetailPage instead. Division Head
// is mandatory: the backend mints a new user + Role for this person in the
// same transaction as the division, no "use an existing person" path.
// Two-step form (same shape as CreateTenantDialog.tsx): step 1 is the
// division's own details, step 2 registers the Division Head.

const EMPTY_FORM = {
  code: '',
  name: '',
  therapy: [] as DivisionTherapy[],
  brandFocus: '',
  mrCount: 0,
  headFirstName: '',
  headLastName: '',
  headEmail: '',
  headPassword: '',
  headPhone: '',
  headGender: '' as '' | 'male' | 'female' | 'other',
}

const CreateDivisionModal = ({ onClose, defaultTenantId }: CreateDivisionModalProps) => {
  const [tenant, setTenant] = useState(defaultTenantId ?? '')
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)

  const createDivision = useCreateDivision()

  const { data: tenantsData } = useTenants({ type: 'customer' })
  const tenants = (tenantsData?.data?.items ?? []).filter((t) => t.type !== 'platform')

  const setField = <K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const resetAndClose = () => {
    setTenant(defaultTenantId ?? '')
    setForm(EMPTY_FORM)
    setError(null)
    setStep(0)
    onClose()
  }

  // Blocks advancing with an incomplete step 1 — full validation still runs
  // via createDivisionSchema on final submit.
  const handleNext = () => {
    if (!tenant) return setError('Company is required')
    if (!form.code.trim()) return setError('Code is required')
    if (!form.name.trim()) return setError('Name is required')
    if (form.therapy.length === 0) return setError('At least one therapy area is required')
    setError(null)
    setStep(1)
  }

  const handleSave = async () => {
    const result = createDivisionSchema.safeParse({
      tenant,
      code: form.code.toLowerCase(),
      name: form.name,
      therapy: form.therapy,
      brandFocus: form.brandFocus || undefined,
      mrCount: form.mrCount,
      head: {
        firstName: form.headFirstName,
        lastName: form.headLastName || undefined,
        email: form.headEmail,
        password: form.headPassword,
        phone: form.headPhone || undefined,
        gender: form.headGender || undefined,
      },
    })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Please complete the required fields.')
      return
    }
    setError(null)

    try {
      await createDivision.mutateAsync(result.data)
      toast.success('Division created')
      onClose()
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(message || 'Could not create the division — try again.')
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) resetAndClose() }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>New division</DialogTitle>
          <DialogDescription>
            {step === 0 ? 'Step 1 of 2 — division details.' : 'Step 2 of 2 — registers the division head.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {step === 0 && (
            <>
              <div>
                <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                  Company *
                </Label>
                <Select key={tenant || 'empty'} value={tenant} onValueChange={(v) => setTenant(v ?? '')}>
                  <SelectTrigger className="w-full text-[13px]">
                    <SelectValue placeholder="Select company...">
                      {(v: string) => tenants.find((t) => t.id === v)?.name ?? 'Select company...'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                  Code *
                </Label>
                <Input
                  type="text"
                  value={form.code}
                  onChange={(e) => setField('code', e.target.value)}
                  placeholder="e.g. cardio1"
                  className="text-[13px]"
                />
              </div>

              <div>
                <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                  Name *
                </Label>
                <Input
                  type="text"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="e.g. Cardiology Division"
                  className="text-[13px]"
                />
              </div>

              <div>
                <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                  Therapy areas *
                </Label>
                <ChipPicker
                  options={THERAPY_OPTIONS}
                  selected={form.therapy}
                  onChange={(v) => setField('therapy', v as DivisionTherapy[])}
                  placeholder="Add a therapy area..."
                  labelFor={(v) => DIVISION_THERAPY_LABEL[v as DivisionTherapy]}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                    Brand focus
                  </Label>
                  <Input
                    type="text"
                    value={form.brandFocus}
                    onChange={(e) => setField('brandFocus', e.target.value)}
                    className="text-[13px]"
                  />
                </div>
                <div>
                  <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                    MR count
                  </Label>
                  <Input
                    type="number"
                    value={form.mrCount || ''}
                    onChange={(e) => setField('mrCount', Number(e.target.value))}
                    className="text-[13px]"
                  />
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                    First name *
                  </Label>
                  <Input
                    type="text"
                    value={form.headFirstName}
                    onChange={(e) => setField('headFirstName', e.target.value)}
                    className="text-[13px]"
                  />
                </div>
                <div>
                  <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                    Last name
                  </Label>
                  <Input
                    type="text"
                    value={form.headLastName}
                    onChange={(e) => setField('headLastName', e.target.value)}
                    className="text-[13px]"
                  />
                </div>
              </div>

              <div>
                <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                  Email *
                </Label>
                <Input
                  type="email"
                  value={form.headEmail}
                  onChange={(e) => setField('headEmail', e.target.value)}
                  className="text-[13px]"
                />
              </div>

              <div>
                <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                  Password *
                </Label>
                <Input
                  type="password"
                  value={form.headPassword}
                  onChange={(e) => setField('headPassword', e.target.value)}
                  className="text-[13px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                    Phone
                  </Label>
                  <Input
                    type="text"
                    value={form.headPhone}
                    onChange={(e) => setField('headPhone', e.target.value)}
                    className="text-[13px]"
                  />
                </div>
                <div>
                  <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                    Gender
                  </Label>
                  <Select key={form.headGender || 'empty'} value={form.headGender} onValueChange={(v) => setField('headGender', (v ?? '') as typeof form.headGender)}>
                    <SelectTrigger className="w-full text-[13px]">
                      <SelectValue placeholder="Select...">
                        {(v: string) => GENDER_OPTIONS.find((g) => g.value === v)?.label ?? 'Select...'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER_OPTIONS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {error && <p className="text-[12px] text-danger">{error}</p>}

          {createDivision.isError && (
            <p className="text-[12px] text-danger">
              {(createDivision.error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Could not create the division — try again.'}
            </p>
          )}
        </div>

        <DialogFooter>
          {step === 0 ? (
            <>
              <Button variant="secondary" onClick={resetAndClose}>Cancel</Button>
              <Button onClick={handleNext} className="font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>
                Next
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setStep(0)} disabled={createDivision.isPending}>
                <FiArrowLeft size={14} /> Back
              </Button>
              <Button onClick={handleSave} disabled={createDivision.isPending} className="font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>
                <FiSave size={14} /> {createDivision.isPending ? 'Creating…' : 'Create division'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CreateDivisionModal
