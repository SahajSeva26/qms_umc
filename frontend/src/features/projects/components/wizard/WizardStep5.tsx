import { FiUsers, FiDollarSign } from 'react-icons/fi'
import type { WizardFormState } from '@/features/projects/wizard.types'
import type { PaymentTerms } from '@/features/projects/project.types'
import { PAYMENT_TERMS_LABEL } from '@/features/projects/project.types'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { PLATFORM_TENANT_CODE, PLATFORM_TENANT_FETCH_LIMIT } from '@/features/access-management/accessManagement.constants'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useRoleTypes } from '@/features/access-management/role-type/hooks/useRoleTypes'
import { useContacts } from '@/features/contacts/hooks/useContacts'
import SectionHeader from '@/components/ui/SectionHeader'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { labelClasses, labelStyle, fieldClasses } from '@/features/projects/components/wizard/wizard.styles'

const PAYMENT_TERMS_OPTIONS: PaymentTerms[] = ['net_30', 'net_60', 'net_90']

interface WizardStep5Props {
  form: WizardFormState
  setField: <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => void
}

// salesRep/projectCoordinator both must be QMS platform-tenant Roles (the
// only thing the backend checks — no job-type rule). marketingContact must
// belong to the project's own tenant and is sourced from Contacts, not Roles.
const WizardStep5 = ({ form, setField }: WizardStep5Props) => {
  // limit: PLATFORM_TENANT_FETCH_LIMIT — the backend defaults to 10 results;
  // the `qms` platform tenant can sort past that window and never resolve.
  // Kept the .find()+code fallback since `type` comes back empty on the wire
  // for a non-system:manage caller.
  const { data: tenantData, isError: tenantsErrored } = useTenants({ type: 'platform', status: 'active', limit: PLATFORM_TENANT_FETCH_LIMIT })
  const platformTenant = tenantData?.data?.items.find((t) => t.type === 'platform' || t.code === PLATFORM_TENANT_CODE)

  // Sales rep — narrowed to the sales-rep RoleType only; Sales Head is
  // explicitly excluded.
  const { data: salesRepTypeData, isLoading: salesRepTypeLoading, isError: salesRepTypeErrored, isSuccess: salesRepTypeLoaded } = useRoleTypes({ code: 'sales-rep', status: 'active' })
  const salesRepTypeId = salesRepTypeData?.data?.items[0]?.id
  // Hard-stop: `sales-rep` is a required seeded RoleType — if the lookup
  // succeeds but returns zero items, the picker can never resolve a rep.
  const salesRepTypeMissing = salesRepTypeLoaded && !salesRepTypeId

  const { data: salesRepRoleData, isLoading: salesRepRolesLoading, isError: salesRepRolesErrored } = useRoles(
    { tenant: platformTenant?.id, type: salesRepTypeId, status: 'active' },
    !!platformTenant && !!salesRepTypeId,
  )
  const salesRoles = salesRepRoleData?.data?.items ?? []
  const salesRolesLoading = salesRepTypeLoading || salesRepRolesLoading
  const salesRolesErrored = tenantsErrored || salesRepTypeErrored || salesRepRolesErrored

  // Project coordinator — narrowed to the camp-coordinator-screening/
  // camp-coordinator-diet RoleTypes. Same merge + hard-stop shape as Sales rep above.
  const { data: coordScreeningTypeData, isLoading: coordScreeningTypeLoading, isError: coordScreeningTypeErrored, isSuccess: coordScreeningTypeLoaded } = useRoleTypes({ code: 'camp-coordinator-screening', status: 'active' })
  const { data: coordDietTypeData } = useRoleTypes({ code: 'camp-coordinator-diet', status: 'active' })
  const coordScreeningTypeId = coordScreeningTypeData?.data?.items[0]?.id
  const coordDietTypeId = coordDietTypeData?.data?.items[0]?.id
  // Hard-stop, same reasoning as salesRepTypeMissing above.
  const coordTypeMissing = coordScreeningTypeLoaded && !coordScreeningTypeId

  const { data: coordScreeningRoleData, isLoading: coordScreeningRolesLoading, isError: coordScreeningRolesErrored } = useRoles(
    { tenant: platformTenant?.id, type: coordScreeningTypeId, status: 'active' },
    !!platformTenant && !!coordScreeningTypeId,
  )
  const { data: coordDietRoleData, isLoading: coordDietRolesLoading, isError: coordDietRolesErrored } = useRoles(
    { tenant: platformTenant?.id, type: coordDietTypeId, status: 'active' },
    !!platformTenant && !!coordDietTypeId,
  )
  const platformRoles = [...(coordScreeningRoleData?.data?.items ?? []), ...(coordDietRoleData?.data?.items ?? [])]
  const platformRolesLoading = coordScreeningTypeLoading || coordScreeningRolesLoading || coordDietRolesLoading
  const platformRolesErrored = tenantsErrored || coordScreeningTypeErrored || coordScreeningRolesErrored || coordDietRolesErrored

  // Scoped to the source lead's own division.
  const { data: marketingContactData, isLoading: marketingContactsLoading, isError: marketingContactsErrored } =
    useContacts({ division: form.leadDivisionId, status: 'active' }, { enabled: !!form.leadDivisionId })
  const marketingContacts = form.leadDivisionId ? marketingContactData?.data?.items ?? [] : []

  return (
    <div className="space-y-1">
      <SectionHeader icon={FiUsers} spaced={false}>Project team</SectionHeader>
      <div className="space-y-4">
        <div>
          <Label className={labelClasses} style={labelStyle}>Project sales rep (QMS internal) *</Label>
          <Select value={form.salesRep} onValueChange={(v) => setField('salesRep', v as string)}>
            <SelectTrigger className={`w-full ${fieldClasses}`}>
              <SelectValue placeholder={salesRolesLoading ? 'Loading...' : 'Select sales rep...'}>
                {(v: string) => {
                  const r = salesRoles.find((role) => role.id === v)
                  return r ? `${r.name} (${r.code})` : salesRolesLoading ? 'Loading...' : 'Select sales rep...'
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {salesRoles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>)}
            </SelectContent>
          </Select>
          {salesRolesErrored && (
            <p className="text-[11px] mt-1 text-danger">Couldn't load sales reps — try again.</p>
          )}
          {salesRepTypeMissing && (
            <p className="text-[11px] mt-1 text-danger">The "Sales rep" role type is missing — a project cannot be created until it's restored.</p>
          )}
        </div>

        <div>
          <Label className={labelClasses} style={labelStyle}>Project coordinator (QMS internal) *</Label>
          <Select value={form.projectCoordinator} onValueChange={(v) => setField('projectCoordinator', v as string)}>
            <SelectTrigger className={`w-full ${fieldClasses}`}>
              <SelectValue placeholder={platformRolesLoading ? 'Loading...' : 'Select coordinator...'}>
                {(v: string) => {
                  const r = platformRoles.find((role) => role.id === v)
                  return r ? `${r.name} (${r.code})` : platformRolesLoading ? 'Loading...' : 'Select coordinator...'
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {platformRoles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>)}
            </SelectContent>
          </Select>
          {platformRolesErrored && (
            <p className="text-[11px] mt-1 text-danger">Couldn't load coordinators — try again.</p>
          )}
          {coordTypeMissing && (
            <p className="text-[11px] mt-1 text-danger">The "Camp coordinator" role type is missing — a project cannot be created until it's restored.</p>
          )}
        </div>

        <div>
          <Label className={labelClasses} style={labelStyle}>Marketing contact from pharma *</Label>
          <Select value={form.marketingContact} onValueChange={(v) => setField('marketingContact', v as string)}>
            <SelectTrigger className={`w-full ${fieldClasses}`}>
              <SelectValue placeholder={marketingContactsLoading ? 'Loading...' : 'Select marketing contact...'}>
                {(v: string) => marketingContacts.find((c) => c.id === v)?.name ?? (marketingContactsLoading ? 'Loading...' : 'Select marketing contact...')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {marketingContacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {marketingContactsErrored && (
            <p className="text-[11px] mt-1 text-danger">Couldn't load marketing contacts — try again.</p>
          )}
        </div>
      </div>

      <SectionHeader icon={FiDollarSign}>Payment terms</SectionHeader>
      <div>
        <Label className={labelClasses} style={labelStyle}>Payment terms *</Label>
        <Select value={form.paymentTerms} onValueChange={(v) => setField('paymentTerms', v as PaymentTerms)}>
          <SelectTrigger className={`w-full ${fieldClasses}`}><SelectValue /></SelectTrigger>
          <SelectContent>
            {PAYMENT_TERMS_OPTIONS.map((t) => <SelectItem key={t} value={t}>{PAYMENT_TERMS_LABEL[t]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <p className="text-[12px] mt-2" style={{ color: 'var(--qms-text-muted)' }}>
        Invoice → Tally → GRN → payment status tracking lives in CRM Invoicing + CFO Accounting.
      </p>
    </div>
  )
}

export default WizardStep5
