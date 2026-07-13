import type { WizardFormState } from '@/features/crm/wizard.types'
import { THERAPIES } from '@/features/crm/crm.mock'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ChipPicker from '@/features/crm/components/wizard/ChipPicker'

const ACCOUNTS = ['Sun Pharma', 'Cipla', "Dr Reddy's", 'Abbott India', 'Lupin', 'Zydus', 'Glenmark', 'Fortis Healthcare']
const SPECIALTIES = [
  'Cardiologist', 'Endocrinologist', 'Pulmonologist', 'Neurologist', 'Orthopedic', 'Gynecologist',
  'Gastroenterologist', 'Dermatologist', 'Nephrologist', 'Oncologist', 'GP', 'CP', 'Other',
]

const labelClasses = 'block text-[10px] font-semibold tracking-widest uppercase mb-2'
const labelStyle = { color: 'var(--qms-text-muted)' }

interface WizardStep1Props {
  form: WizardFormState
  setField: <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => void
}

const WizardStep1 = ({ form, setField }: WizardStep1Props) => (
  <div className="space-y-4">
    <div>
      <Label className={labelClasses} style={labelStyle}>Pharma company *</Label>
      <Select value={form.pharmaCompanyName} onValueChange={(v) => setField('pharmaCompanyName', v as string)}>
        <SelectTrigger className="w-full text-[13px]"><SelectValue placeholder="Select company..." /></SelectTrigger>
        <SelectContent>
          {ACCOUNTS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>

    <div>
      <Label className={labelClasses} style={labelStyle}>Division</Label>
      <Input type="text" value={form.divisionName} onChange={(e) => setField('divisionName', e.target.value)} className="text-[13px]" placeholder="e.g. Cardio Care" />
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label className={labelClasses} style={labelStyle}>Contact person *</Label>
        <Input type="text" value={form.contact} onChange={(e) => setField('contact', e.target.value)} className="text-[13px]" placeholder="Dr. Name" />
      </div>
      <div>
        <Label className={labelClasses} style={labelStyle}>Role</Label>
        <Input type="text" value={form.contactRole} onChange={(e) => setField('contactRole', e.target.value)} className="text-[13px]" placeholder="Brand Mgr" />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label className={labelClasses} style={labelStyle}>Email</Label>
        <Input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} className="text-[13px]" />
      </div>
      <div>
        <Label className={labelClasses} style={labelStyle}>Phone</Label>
        <Input type="tel" value={form.phone} onChange={(e) => setField('phone', e.target.value)} className="text-[13px]" />
      </div>
    </div>

    <div>
      <Label className={labelClasses} style={labelStyle}>Focus therapy *</Label>
      <ChipPicker options={THERAPIES} selected={form.focusTherapies} onChange={(v) => setField('focusTherapies', v)} placeholder="Add a therapy area..." />
    </div>

    <div>
      <Label className={labelClasses} style={labelStyle}>Focus doctor specialty *</Label>
      <ChipPicker options={SPECIALTIES} selected={form.focusDoctors} onChange={(v) => setField('focusDoctors', v)} placeholder="Add a specialty..." />
      {form.focusDoctors.includes('Other') && (
        <Input
          type="text"
          value={form.focusDoctorOther}
          onChange={(e) => setField('focusDoctorOther', e.target.value)}
          className="text-[13px] mt-2"
          placeholder="Specify other specialty *"
        />
      )}
    </div>

    <div>
      <Label className={labelClasses} style={labelStyle}>Brands</Label>
      <ChipPicker options={['Nebicard', 'Glargen', 'Pulmocort', 'Insureone', 'Zycort']} selected={form.brandNames} onChange={(v) => setField('brandNames', v)} placeholder="Add a brand..." />
    </div>
  </div>
)

export default WizardStep1
