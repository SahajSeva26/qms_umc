import { useState } from 'react'
import { FiSave } from 'react-icons/fi'
import type { DivisionTherapy } from '@/types/crm.types'
import { DIVISION_THERAPY_LABEL } from '@/types/crm.types'
import { createDivisionSchema } from '@/features/crm/divisions/schemas/division.schemas'
import { useCreateDivision } from '@/features/crm/divisions/hooks/useCreateDivision'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
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

// Create-only — editing happens on DivisionDetailPage instead. Company picker
// always shows (backend requires an explicit `tenant` for every caller, no
// force-pinning like Contact's create). Division Head is mandatory: the
// backend mints a new user + Role for this person in the same transaction as
// the division, with no "use an existing person" path.
const CreateDivisionModal = ({ onClose, defaultTenantId }: CreateDivisionModalProps) => {
  const [tenant, setTenant] = useState(defaultTenantId ?? '')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [therapy, setTherapy] = useState<DivisionTherapy | ''>('')
  const [brandFocus, setBrandFocus] = useState('')
  const [mrCount, setMrCount] = useState(0)
  const [headFirstName, setHeadFirstName] = useState('')
  const [headLastName, setHeadLastName] = useState('')
  const [headEmail, setHeadEmail] = useState('')
  const [headPassword, setHeadPassword] = useState('')
  const [headPhone, setHeadPhone] = useState('')
  const [headGender, setHeadGender] = useState<'male' | 'female' | 'other' | ''>('')
  const [error, setError] = useState<string | null>(null)

  const createDivision = useCreateDivision()
  
  const { data: tenantsData } = useTenants({ type: 'customer' })
  const tenants = (tenantsData?.data?.items ?? []).filter((t) => t.type !== 'platform')

  const handleSave = async () => {
    const result = createDivisionSchema.safeParse({
      tenant,
      code: code.toLowerCase(),
      name,
      therapy: therapy || undefined,
      brandFocus: brandFocus || undefined,
      mrCount,
      head: {
        firstName: headFirstName,
        lastName: headLastName || undefined,
        email: headEmail,
        password: headPassword,
        phone: headPhone || undefined,
        gender: headGender || undefined,
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
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not create the division — try again.')
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>New division</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
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
              value={code}
              onChange={(e) => setCode(e.target.value)}
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cardiology Division"
              className="text-[13px]"
            />
          </div>

          <div>
            <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              Therapy area *
            </Label>
            <Select value={therapy} onValueChange={(v) => setTherapy(v as DivisionTherapy)}>
              <SelectTrigger className="w-full text-[13px]">
                <SelectValue placeholder="Select therapy area...">
                  {(v: string) => DIVISION_THERAPY_LABEL[v as DivisionTherapy] ?? 'Select therapy area...'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {THERAPY_OPTIONS.map((t) => <SelectItem key={t} value={t}>{DIVISION_THERAPY_LABEL[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                Brand focus
              </Label>
              <Input
                type="text"
                value={brandFocus}
                onChange={(e) => setBrandFocus(e.target.value)}
                className="text-[13px]"
              />
            </div>
            <div>
              <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                MR count
              </Label>
              <Input
                type="number"
                value={mrCount || ''}
                onChange={(e) => setMrCount(Number(e.target.value))}
                className="text-[13px]"
              />
            </div>
          </div>

          <div className="pt-2 mt-1 border-t" style={{ borderColor: 'var(--qms-border)' }}>
            <p className="text-[11px] font-bold uppercase tracking-wide mb-2.5" style={{ color: 'var(--qms-text)' }}>
              Division Head
            </p>

            <div className="grid grid-cols-2 gap-2.5 mb-2.5">
              <div>
                <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                  First name *
                </Label>
                <Input
                  type="text"
                  value={headFirstName}
                  onChange={(e) => setHeadFirstName(e.target.value)}
                  className="text-[13px]"
                />
              </div>
              <div>
                <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                  Last name
                </Label>
                <Input
                  type="text"
                  value={headLastName}
                  onChange={(e) => setHeadLastName(e.target.value)}
                  className="text-[13px]"
                />
              </div>
            </div>

            <div className="mb-2.5">
              <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                Email *
              </Label>
              <Input
                type="email"
                value={headEmail}
                onChange={(e) => setHeadEmail(e.target.value)}
                className="text-[13px]"
              />
            </div>

            <div className="mb-2.5">
              <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                Password *
              </Label>
              <Input
                type="password"
                value={headPassword}
                onChange={(e) => setHeadPassword(e.target.value)}
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
                  value={headPhone}
                  onChange={(e) => setHeadPhone(e.target.value)}
                  className="text-[13px]"
                />
              </div>
              <div>
                <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                  Gender
                </Label>
                <Select key={headGender || 'empty'} value={headGender} onValueChange={(v) => setHeadGender((v ?? '') as typeof headGender)}>
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
          </div>

          {error && <p className="text-[12px] text-danger">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={createDivision.isPending} className="font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>
            <FiSave size={14} /> {createDivision.isPending ? 'Creating…' : 'Create division'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CreateDivisionModal
