import type { WizardFormState } from '@/features/crm/wizard.types'
import { computeWizardScore } from '@/features/crm/wizard.types'
import { LEAD_PROJECT_TYPE_LABEL } from '@/types/crm.types'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useRoleTypes } from '@/features/access-management/role-type/hooks/useRoleTypes'
import { PLATFORM_TENANT_CODE } from '@/features/access-management/accessManagement.constants'
import { formatINR } from '@/utils/formatters'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import DatePicker from '@/components/ui/DatePicker'
import { ReviewCard, ReviewGrid, ReviewField } from '@/components/ui/ReviewCard'
import { labelClasses, labelStyle, fieldClasses } from '@/features/crm/components/wizard/wizard.styles'

interface WizardStep4Props {
  form: WizardFormState
  setField: <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => void
}

const WizardStep4 = ({ form, setField }: WizardStep4Props) => {
  const score = computeWizardScore(form)

  const { data: tenantData, isError: tenantsErrored } = useTenants({ status: 'active' })
  // tenant.type is only present on the wire for a system:manage caller
  // (TenantMapper.toResponse) — code is always present regardless of
  // permission, so match on it as a fallback rather than leaving this
  // permanently unresolved for every other real caller (tenant:manage
  // admins included). Found via a 2026-07-26 test pass.
  const platformTenant = tenantData?.data?.items.find((t) => t.type === 'platform' || t.code === PLATFORM_TENANT_CODE)

  // "Sales rep" here means someone with the sales-rep OR sales-head RoleType
  // — NOT "any platform-tenant Role" (the old query), which let Admin/System
  // accounts show up as pickable "sales reps." lead.service.ts's own
  // salesPerson check only verifies "belongs to the platform tenant," no
  // job-type check at all — that's a backend-side gap, flagged separately;
  // this fixes the UI so the form never OFFERS something nonsensical like
  // "System role," even though the backend wouldn't reject it if sent
  // directly. Roles' own `type` search filter only accepts one RoleType id
  // at a time (role.service.ts's search()), so both role types are queried
  // in parallel and merged, since Sales Head can also own leads directly
  // (holds lead:manage, per defaultRoleTypes.ts) same as Sales Rep.
  // No `tenant` filter needed on these two lookups — `code` is an exact
  // match and 'sales-rep'/'sales-head' are platform-only conventions
  // (confirmed live: exactly one of each exists system-wide); the actual
  // tenant scoping that matters happens implicitly below, since a Role's
  // `type` must belong to the same tenant as the Role itself.
  const { data: salesRepTypeData, isLoading: roleTypesLoading, isError: roleTypesErrored } = useRoleTypes({ code: 'sales-rep', status: 'active' })
  const { data: salesHeadTypeData } = useRoleTypes({ code: 'sales-head', status: 'active' })
  const salesRepTypeId = salesRepTypeData?.data?.items[0]?.id
  const salesHeadTypeId = salesHeadTypeData?.data?.items[0]?.id

  const { data: salesRepRoleData, isLoading: salesRepRolesLoading, isError: salesRepRolesErrored } = useRoles(
    { tenant: platformTenant?.id, type: salesRepTypeId, status: 'active' },
    !!platformTenant && !!salesRepTypeId,
  )
  const { data: salesHeadRoleData, isLoading: salesHeadRolesLoading, isError: salesHeadRolesErrored } = useRoles(
    { tenant: platformTenant?.id, type: salesHeadTypeId, status: 'active' },
    !!platformTenant && !!salesHeadTypeId,
  )
  const salesRoles = [...(salesRepRoleData?.data?.items ?? []), ...(salesHeadRoleData?.data?.items ?? [])]
  const rolesLoading = roleTypesLoading || salesRepRolesLoading || salesHeadRolesLoading
  const rolesErrored = roleTypesErrored || salesRepRolesErrored || salesHeadRolesErrored

  const selectSalesPerson = (roleId: string) => {
    const role = salesRoles.find((r) => r.id === roleId)
    setField('salesPersonId', roleId)
    setField('salesPersonLabel', role?.name ?? '')
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <Label className={labelClasses} style={labelStyle}>Estimated value (₹)</Label>
          <Input
            type="number"
            value={form.estimatedValue || ''}
            onChange={(e) => setField('estimatedValue', Number(e.target.value))}
            className={fieldClasses}
          />
        </div>
        <div>
          <Label className={labelClasses} style={labelStyle}>Next follow-up date *</Label>
          <DatePicker
            value={form.followUpDate}
            onChange={(iso) => setField('followUpDate', iso)}
            className={`w-full ${fieldClasses}`}
          />
        </div>
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>
          Confidence — <span style={{ color: 'var(--qms-brand)', fontWeight: 800 }}>{form.confidence}%</span>
        </Label>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={form.confidence}
          onChange={(e) => setField('confidence', Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>Sales rep *</Label>
        <Select value={form.salesPersonId} onValueChange={(v) => selectSalesPerson(v as string)}>
          <SelectTrigger className={`w-full ${fieldClasses}`}>
            <SelectValue placeholder={rolesLoading ? 'Loading...' : 'Select sales rep...'}>
              {(v: string) => {
                const r = salesRoles.find((role) => role.id === v)
                return r ? `${r.name} (${r.code})` : rolesLoading ? 'Loading...' : 'Select sales rep...'
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {salesRoles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>)}
          </SelectContent>
        </Select>
        {(tenantsErrored || rolesErrored) && (
          <p className="text-[11px] mt-1 text-danger">Couldn't load sales reps — try again.</p>
        )}
        {!tenantsErrored && !rolesErrored && !rolesLoading && !platformTenant && (
          <p className="text-[11px] mt-1 text-danger">No QMS internal (platform) company found — a sales rep must belong to one.</p>
        )}
      </div>

      <p className="text-[12px] mt-2" style={{ color: 'var(--qms-text-muted)' }}>
        Lead opens in status <b>New</b>. Transition forward by drag-drop in the kanban.
      </p>

      <ReviewCard>
        <ReviewGrid>
          <ReviewField label="Pharma" value={form.tenantLabel || '—'} />
          <ReviewField label="Division" value={form.divisionLabel || '—'} />
          <ReviewField label="Focus therapy" value={form.focusTherapy.join(', ') || '—'} />
          <ReviewField label="MRs" value={form.numberOfMRS ? String(form.numberOfMRS) : '—'} />
          <ReviewField label="Project type" value={form.projectType ? LEAD_PROJECT_TYPE_LABEL[form.projectType] : '—'} />
          <ReviewField label="QMS offer" value={form.offers.length ? String(form.offers.length) : '—'} />
          <ReviewField label="AI score" value={String(score)} />
          <ReviewField label="Value" value={formatINR(form.estimatedValue)} />
        </ReviewGrid>
        {form.problemStatement && (
          <div className="mt-3">
            <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-soft)' }}>Problem statement</div>
            <div className="text-[13px] mt-1 leading-snug" style={{ color: 'var(--qms-text)' }}>{form.problemStatement}</div>
          </div>
        )}
      </ReviewCard>
    </div>
  )
}

export default WizardStep4
