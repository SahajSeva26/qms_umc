import type { WizardFormState } from '@/features/crm/wizard.types'
import { useDivisions } from '@/features/crm/divisions/hooks/useDivisions'
import { useContacts } from '@/features/contacts/hooks/useContacts'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import ChipPicker from '@/features/crm/components/wizard/ChipPicker'
import TenantIdPicker from '@/features/crm/components/wizard/TenantIdPicker'
import { labelClasses, labelStyle, fieldClasses } from '@/features/crm/components/wizard/wizard.styles'
import { THERAPIES, SPECIALTIES } from '@/features/crm/crm.constants'

interface WizardStep1Props {
  form: WizardFormState
  setField: <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => void
}

const WizardStep1 = ({ form, setField }: WizardStep1Props) => {
  const { data: divisionData, isLoading: divisionsLoading, isError: divisionsErrored } = useDivisions({ tenant: form.tenantId || undefined }, !!form.tenantId)
  const divisions = form.tenantId ? divisionData?.data?.items ?? [] : []

  // Scoped by division, not tenant — Contact.division is required for
  // customer-type contacts (contact.service.ts:112). Gated on divisionId
  // since there's nothing to pick until one is chosen.
  const { data: contactData, isLoading: contactsLoading, isError: contactsErrored } = useContacts({ division: form.divisionId || undefined, status: 'active' }, { enabled: !!form.divisionId })
  const contactPeople = form.divisionId ? contactData?.data?.items ?? [] : []

  const selectTenant = (tenantId: string, tenantLabel: string) => {
    setField('tenantId', tenantId)
    setField('tenantLabel', tenantLabel)
    setField('divisionId', '')
    setField('divisionLabel', '')
    setField('contactPersonId', '')
    setField('contactPersonLabel', '')
  }

  const selectDivision = (divisionId: string) => {
    const division = divisions.find((d) => d.id === divisionId)
    setField('divisionId', divisionId)
    setField('divisionLabel', division?.name ?? '')
    setField('contactPersonId', '')
    setField('contactPersonLabel', '')
  }

  const selectContactPerson = (contactId: string) => {
    const contactPerson = contactPeople.find((c) => c.id === contactId)
    setField('contactPersonId', contactId)
    setField('contactPersonLabel', contactPerson?.name ?? '')
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className={labelClasses} style={labelStyle}>Pharma company *</Label>
        <TenantIdPicker value={form.tenantId} label={form.tenantLabel} onChange={selectTenant} />
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>Division *</Label>
        <Select key={form.divisionId || 'empty'} value={form.divisionId || undefined} onValueChange={(v) => selectDivision(v as string)} disabled={!form.tenantId}>
          <SelectTrigger className={`w-full ${fieldClasses}`}>
            <SelectValue placeholder="Select division...">
              {(v: string) =>
                divisions.find((d) => d.id === v)?.name ??
                (!form.tenantId ? 'Select a company first' : divisionsLoading ? 'Loading...' : 'Select division...')
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {divisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {divisionsErrored && (
          <p className="text-[11px] mt-1 text-danger">Couldn't load divisions — try again.</p>
        )}
        {!divisionsErrored && !divisionsLoading && form.tenantId && divisions.length === 0 && (
          <p className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>This company has no divisions yet.</p>
        )}
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>Contact person *</Label>
        <Select key={form.contactPersonId || 'empty'} value={form.contactPersonId || undefined} onValueChange={(v) => selectContactPerson(v as string)} disabled={!form.divisionId}>
          <SelectTrigger className={`w-full ${fieldClasses}`}>
            <SelectValue placeholder="Select contact person...">
              {(v: string) =>
                contactPeople.find((c) => c.id === v)?.name ??
                (!form.divisionId ? 'Select a division first' : contactsLoading ? 'Loading...' : 'Select contact person...')
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {contactPeople.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {contactsErrored && (
          <p className="text-[11px] mt-1 text-danger">Couldn't load contacts — try again.</p>
        )}
        {!contactsErrored && !contactsLoading && form.divisionId && contactPeople.length === 0 && (
          <p className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>This division has no contacts yet.</p>
        )}
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>Focus therapy *</Label>
        <ChipPicker options={THERAPIES} selected={form.focusTherapy} onChange={(v) => setField('focusTherapy', v)} placeholder="Add a therapy area..." />
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>Focus doctor specialty *</Label>
        <ChipPicker options={SPECIALTIES} selected={form.focusTherapyDoctor} onChange={(v) => setField('focusTherapyDoctor', v)} placeholder="Add a specialty..." />
      </div>
    </div>
  )
}

export default WizardStep1
