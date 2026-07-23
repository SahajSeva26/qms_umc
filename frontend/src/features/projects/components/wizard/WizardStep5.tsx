import { FiUsers, FiDollarSign } from 'react-icons/fi'
import type { WizardFormState } from '@/features/projects/wizard.types'
import type { PaymentTerms } from '@/types/project.types'
import { PAYMENT_TERMS_LABEL } from '@/types/project.types'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import SectionHeader from '@/components/ui/SectionHeader'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { labelClasses, labelStyle, fieldClasses } from '@/features/projects/components/wizard/wizard.styles'

const PAYMENT_TERMS_OPTIONS: PaymentTerms[] = ['net_30', 'net_60', 'net_90']

interface WizardStep5Props {
  form: WizardFormState
  setField: <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => void
}

// Replicates EditLeadModal.tsx's exact cascading-picker recipe:
// salesRep/projectCoordinator both must be QMS platform-tenant Roles
// (project.service.ts's assertPlatformStaff), so both share one fetched
// platform-tenant Role list. marketingContact must belong to the project's
// OWN tenant (the lead-derived tenant from Step 0), a separate, different
// rule from the other two.
const WizardStep5 = ({ form, setField }: WizardStep5Props) => {
  const { data: tenantData, isError: tenantsErrored } = useTenants({ status: 'active' })
  const platformTenant = tenantData?.data?.items.find((t) => t.type === 'platform')

  const { data: platformRoleData, isLoading: platformRolesLoading, isError: platformRolesErrored } =
    useRoles(platformTenant ? { tenant: platformTenant.id, status: 'active' } : { tenant: undefined })
  const platformRoles = platformTenant ? platformRoleData?.data?.items ?? [] : []

  const { data: marketingRoleData, isLoading: marketingRolesLoading, isError: marketingRolesErrored } =
    useRoles(form.leadTenantId ? { tenant: form.leadTenantId, status: 'active' } : { tenant: undefined })
  const marketingRoles = form.leadTenantId ? marketingRoleData?.data?.items ?? [] : []

  return (
    <div className="space-y-1">
      <SectionHeader icon={FiUsers} spaced={false}>Project team</SectionHeader>
      <div className="space-y-4">
        <div>
          <Label className={labelClasses} style={labelStyle}>Project sales rep (QMS internal) *</Label>
          <Select value={form.salesRep} onValueChange={(v) => setField('salesRep', v as string)}>
            <SelectTrigger className={`w-full ${fieldClasses}`}>
              <SelectValue placeholder={platformRolesLoading ? 'Loading...' : 'Select sales rep...'}>
                {(v: string) => {
                  const r = platformRoles.find((role) => role.id === v)
                  return r ? `${r.name} (${r.code})` : platformRolesLoading ? 'Loading...' : 'Select sales rep...'
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {platformRoles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>)}
            </SelectContent>
          </Select>
          {(tenantsErrored || platformRolesErrored) && (
            <p className="text-[11px] mt-1 text-danger">Couldn't load sales reps — try again.</p>
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
        </div>

        <div>
          <Label className={labelClasses} style={labelStyle}>Marketing contact from pharma *</Label>
          <Select value={form.marketingContact} onValueChange={(v) => setField('marketingContact', v as string)}>
            <SelectTrigger className={`w-full ${fieldClasses}`}>
              <SelectValue placeholder={marketingRolesLoading ? 'Loading...' : 'Select marketing contact...'}>
                {(v: string) => {
                  const r = marketingRoles.find((role) => role.id === v)
                  return r ? `${r.name} (${r.code})` : marketingRolesLoading ? 'Loading...' : 'Select marketing contact...'
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {marketingRoles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>)}
            </SelectContent>
          </Select>
          {marketingRolesErrored && (
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
