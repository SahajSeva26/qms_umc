import { FiUsers, FiDollarSign } from 'react-icons/fi'
import type { WizardFormState } from '@/features/projects/wizard.types'
import { SALES_PEOPLE, COORDINATOR_PEOPLE, MARKETING_CONTACTS } from '@/features/projects/projects.mock'
import SectionHeader from '@/components/ui/SectionHeader'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { labelClasses, labelStyle, fieldClasses } from '@/features/projects/components/wizard/wizard.styles'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

interface WizardStep5Props {
  form: WizardFormState
  setField: <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => void
}

const WizardStep5 = ({ form, setField }: WizardStep5Props) => {
  const marketingOptions = MARKETING_CONTACTS.filter((m) => !form.clientId || m.clientId === form.clientId)

  return (
    <div className="space-y-1">
      <SectionHeader icon={FiUsers} spaced={false}>Project team</SectionHeader>
      <div className="space-y-4">
      <div>
        <Label className={labelClasses} style={labelStyle}>Project sales person (QMS) *</Label>
        <Select value={form.salesPersonId} onValueChange={(v) => setField('salesPersonId', v as string)}>
          <SelectTrigger className={`w-full ${fieldClasses}`}><SelectValue placeholder="— select —" /></SelectTrigger>
          <SelectContent>
            {SALES_PEOPLE.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name} · {p.role}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>Project coordinator (Camp Head)</Label>
        <Select value={form.coordinatorId} onValueChange={(v) => setField('coordinatorId', v as string)}>
          <SelectTrigger className={`w-full ${fieldClasses}`}><SelectValue placeholder="— select —" /></SelectTrigger>
          <SelectContent>
            {COORDINATOR_PEOPLE.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name} · {p.role}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>Marketing contact from pharma</Label>
        <Select value={form.marketingContactId} onValueChange={(v) => setField('marketingContactId', v as string)}>
          <SelectTrigger className={`w-full ${fieldClasses}`}><SelectValue placeholder="— select —" /></SelectTrigger>
          <SelectContent>
            {marketingOptions.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.name} · {m.designation}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      </div>

      <SectionHeader icon={FiDollarSign}>Payment terms</SectionHeader>
      <div>
        <Label className={labelClasses} style={labelStyle}>Payment terms</Label>
        <Input type="text" value={form.paymentTerms} onChange={(e) => setField('paymentTerms', e.target.value)} className={fieldClasses} placeholder="Net 30 / Net 45 / 50% advance + 50% on completion…" />
      </div>

      <p className="text-[12px] mt-2" style={{ color: 'var(--qms-text-muted)' }}>
        Invoice → Tally → GRN → payment status tracking lives in CRM Invoicing + CFO Accounting.
      </p>
    </div>
  )
}

export default WizardStep5
