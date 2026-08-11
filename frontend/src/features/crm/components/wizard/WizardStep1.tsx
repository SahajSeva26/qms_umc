import { useState } from 'react'
import type { WizardFormState } from '@/features/crm/wizard.types'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useDivisions } from '@/features/crm/hooks/useDivisions'
import { useContacts } from '@/features/contacts/hooks/useContacts'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ChipPicker from '@/features/crm/components/wizard/ChipPicker'
import { labelClasses, labelStyle, fieldClasses } from '@/features/crm/components/wizard/wizard.styles'
import { THERAPIES, SPECIALTIES } from '@/features/crm/crm.constants'

interface WizardStep1Props {
  form: WizardFormState
  setField: <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => void
}

const WizardStep1 = ({ form, setField }: WizardStep1Props) => {
  const [tenantSearch, setTenantSearch] = useState('')

  // limit: '20' — before a search term narrows the real filter, this should
  // still reflect a realistic slice of all active companies, not just the
  // backend's default first-10 (requestHandler.ts).
  const { data: tenantData, isLoading: tenantsLoading, isError: tenantsErrored } = useTenants({ name: tenantSearch || undefined, status: 'active', limit: '20' })
  const tenants = tenantData?.data?.items ?? []

  // Both gated on `!!form.tenantId` — neither should fire an unscoped,
  // every-tenant call before a company is actually picked (was firing on
  // mount, before this fix: Divisions returned whichever companies' divisions
  // happened to sort first, Roles returned whichever tenant's roles sorted
  // first — both wrong-scoped and both wasted, since this step is unusable
  // without a company selected anyway).
  //
  // NOT `tenantId` — SearchDivisionQuery's own field is stale (see its
  // comment); the real backend query param is `tenant`
  // (division.validators.ts's SearchDivisionQuerySchema). Sending `tenantId`
  // compiles but is silently ignored server-side, returning EVERY tenant's
  // divisions unscoped — confirmed live 2026-08-07 (selecting "Sun Pharma"
  // still showed "Cadila Healthcare Cardiology Division" as pickable). Same
  // root cause already worked around in RoleDetailPage.tsx/NewAppointmentDialog.tsx.
  const { data: divisionData, isLoading: divisionsLoading, isError: divisionsErrored } = useDivisions({ tenant: form.tenantId || undefined } as unknown as { tenantId?: string }, !!form.tenantId)
  const divisions = form.tenantId ? divisionData?.data?.items ?? [] : []

  // Backend switched Lead.contactPerson from a Role reference to a Contact
  // reference 2026-08-03 (lead.model.ts's contactPerson.ref, lead.service.ts's
  // set() now calls ContactService.get() instead of RoleService.get()) — this
  // picker follows that change; previously deliberately sourced from Roles
  // per the old ref, now Contacts per the new one.
  const { data: contactData, isLoading: contactsLoading, isError: contactsErrored } = useContacts({ tenant: form.tenantId || undefined, status: 'active' }, { enabled: !!form.tenantId })
  const contactPeople = form.tenantId ? contactData?.data?.items ?? [] : []

  const selectTenant = (tenantId: string) => {
    const tenant = tenants.find((t) => t.id === tenantId)
    setField('tenantId', tenantId)
    setField('tenantLabel', tenant?.name ?? '')
    setField('divisionId', '')
    setField('divisionLabel', '')
    setField('contactPersonId', '')
    setField('contactPersonLabel', '')
  }

  const selectDivision = (divisionId: string) => {
    const division = divisions.find((d) => d.id === divisionId)
    setField('divisionId', divisionId)
    setField('divisionLabel', division?.name ?? '')
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
        <Input
          type="text"
          value={tenantSearch}
          onChange={(e) => setTenantSearch(e.target.value)}
          className={`${fieldClasses} mb-2`}
          placeholder="Search company by name..."
        />
        <Select value={form.tenantId} onValueChange={(v) => selectTenant(v as string)}>
          <SelectTrigger className={`w-full ${fieldClasses}`}>
            {/* Render-prop child, not a plain placeholder: base-ui's SelectValue
                only auto-resolves a selected value's label from an `items` prop
                passed to Select.Root, which this wrapper never supplies — left as
                a bare placeholder it renders the raw id once something is picked
                (see @base-ui/react/internals/resolveValueLabel.mjs). Matches the
                lookup pattern accessManagement's RolesFilterBar already uses. */}
            <SelectValue placeholder={tenantsLoading ? 'Loading...' : 'Select company...'}>
              {(v: string) => {
                const t = tenants.find((tenant) => tenant.id === v)
                return t ? `${t.name} (${t.code})` : tenantsLoading ? 'Loading...' : 'Select company...'
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} ({t.code})</SelectItem>)}
          </SelectContent>
        </Select>
        {tenantsErrored && (
          <p className="text-[11px] mt-1 text-danger">Couldn't load companies — try again.</p>
        )}
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>Division *</Label>
        <Select value={form.divisionId} onValueChange={(v) => selectDivision(v as string)} disabled={!form.tenantId}>
          <SelectTrigger className={`w-full ${fieldClasses}`}>
            <SelectValue placeholder={!form.tenantId ? 'Select a company first' : divisionsLoading ? 'Loading...' : 'Select division...'}>
              {(v: string) => divisions.find((d) => d.id === v)?.name ?? (divisionsLoading ? 'Loading...' : 'Select division...')}
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
        <Select value={form.contactPersonId} onValueChange={(v) => selectContactPerson(v as string)} disabled={!form.tenantId}>
          <SelectTrigger className={`w-full ${fieldClasses}`}>
            <SelectValue placeholder={!form.tenantId ? 'Select a company first' : contactsLoading ? 'Loading...' : 'Select contact person...'}>
              {(v: string) => contactPeople.find((c) => c.id === v)?.name ?? (contactsLoading ? 'Loading...' : 'Select contact person...')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {contactPeople.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {contactsErrored && (
          <p className="text-[11px] mt-1 text-danger">Couldn't load contacts — try again.</p>
        )}
        {!contactsErrored && !contactsLoading && form.tenantId && contactPeople.length === 0 && (
          <p className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>This company has no contacts yet.</p>
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
