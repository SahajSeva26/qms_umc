import type { WizardFormState } from '@/features/crm/wizard.types'
import { computeWizardScore } from '@/features/crm/wizard.types'
import { LEAD_PROJECT_TYPE_LABEL } from '@/types/crm.types'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
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
  const platformTenant = tenantData?.data?.items.find((t) => t.type === 'platform')

  const { data: roleData, isLoading: rolesLoading, isError: rolesErrored } = useRoles(platformTenant ? { tenant: platformTenant.id, status: 'active' } : { tenant: undefined })
  const salesRoles = platformTenant ? roleData?.data?.items ?? [] : []

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
          <p className="text-[11px] mt-1 text-danger">No QMS internal (platform) tenant found — a sales rep must belong to one.</p>
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
