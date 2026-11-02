import { FiTrash2 } from 'react-icons/fi'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@qms/ui'
import TenantIdPicker from '@/features/crm/weeklyPlan/components/TenantIdPicker'
import DivisionIdPicker from '@/features/crm/weeklyPlan/components/DivisionIdPicker'
import ContactPersonIdPicker from '@/features/crm/weeklyPlan/components/ContactPersonIdPicker'
import LeadIdPicker from '@/features/crm/appointments/components/LeadIdPicker'
import InvoiceIdPicker from '@/features/crm/weeklyPlan/components/InvoiceIdPicker'
import {
  fieldInputClassName,
  fieldInputStyle,
} from '@/features/crm/appointments/components/appointmentField.styles'
import { isOutsideWeek, toNoonIso } from '@/features/crm/weeklyPlan/components/weeklyPlanDates'
import type { WeeklyPlanItemPayload } from '@/types/weeklyPlan.types'

// A single planned-visit row within a weekly plan draft. The *Label fields are kept alongside
// the payload fields purely for picker display — not sent to the backend.
export interface WeeklyPlanRowDraft extends WeeklyPlanItemPayload {
  tenantLabel?: string
  divisionLabel?: string
  contactPersonLabel?: string
  leadLabel?: string
  invoiceLabel?: string
}

const labelClasses = 'block text-[11px] font-bold tracking-[.04em] uppercase mb-1.5'
const labelStyle = { color: 'var(--qms-text-muted)' }

interface WeeklyPlanRowFieldsProps {
  row: WeeklyPlanRowDraft
  index: number
  onChange: (index: number, patch: Partial<WeeklyPlanRowDraft>) => void
  onRemove: (index: number) => void
  canRemove: boolean
  /** The plan's own week bounds (YYYY-MM-DD) — visit dates must fall inside this range. */
  weekStart: string
  weekEnd: string
}

// Tenant/division/contact use search-as-you-type pickers, not a plain <Select> fed by one page.
const WeeklyPlanRowFields = ({ row, index, onChange, onRemove, canRemove, weekStart, weekEnd }: WeeklyPlanRowFieldsProps) => {
  const selectTenant = (tenantId: string, tenantLabel: string) => {
    onChange(index, { tenant: tenantId, tenantLabel, division: '', divisionLabel: '', contactPerson: '', contactPersonLabel: '' })
  }

  return (
    <div className="rounded-xl border p-3 space-y-3" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-extrabold uppercase tracking-[.06em]" style={{ color: 'var(--qms-text-muted)' }}>
          Visit {index + 1}
        </span>
        {canRemove && (
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-danger" onClick={() => onRemove(index)}>
            <FiTrash2 size={14} />
          </Button>
        )}
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>Company *</Label>
        <TenantIdPicker value={row.tenant} label={row.tenantLabel ?? ''} onChange={selectTenant} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className={labelClasses} style={labelStyle}>Division *</Label>
          <DivisionIdPicker
            value={row.division}
            label={row.divisionLabel ?? ''}
            tenantId={row.tenant || undefined}
            onChange={(id, lbl) => onChange(index, { division: id, divisionLabel: lbl, contactPerson: '', contactPersonLabel: '' })}
          />
        </div>
        <div>
          <Label className={labelClasses} style={labelStyle}>Contact person *</Label>
          <ContactPersonIdPicker
            value={row.contactPerson}
            label={row.contactPersonLabel ?? ''}
            divisionId={row.division || undefined}
            onChange={(id, lbl) => onChange(index, { contactPerson: id, contactPersonLabel: lbl })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className={labelClasses} style={labelStyle}>Visit date *</Label>
          <DatePicker
            value={row.date ? row.date.slice(0, 10) : ''}
            onChange={(d) => onChange(index, { date: d ? new Date(toNoonIso(d)).toISOString() : '' })}
            className={`w-full ${fieldInputClassName} border-(--qms-border-strong) bg-(--qms-surface-strong)`}
            startMonth={weekStart ? new Date(`${weekStart}T00:00:00`) : undefined}
            endMonth={weekEnd ? new Date(`${weekEnd}T00:00:00`) : undefined}
          />
          {row.date && weekStart && weekEnd && isOutsideWeek(row.date, weekStart, weekEnd) && (
            <p className="text-[11px] mt-1 text-danger">Visit date must fall within the plan's week.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className={labelClasses} style={labelStyle}>Linked lead (follow-up visit)</Label>
          <LeadIdPicker
            value={row.lead ?? ''}
            label={row.leadLabel ?? ''}
            divisionId={row.division || undefined}
            onChange={(id, lbl) => onChange(index, { lead: id || undefined, leadLabel: lbl })}
          />
        </div>
        <div>
          <Label className={labelClasses} style={labelStyle}>Linked invoice (collection visit)</Label>
          <InvoiceIdPicker
            value={row.invoice ?? ''}
            label={row.invoiceLabel ?? ''}
            tenantId={row.tenant || undefined}
            onChange={(id, lbl) => onChange(index, { invoice: id || undefined, invoiceLabel: lbl })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className={labelClasses} style={labelStyle}>Agenda</Label>
          <Textarea
            value={row.agenda?.public ?? ''}
            onChange={(e) => onChange(index, { agenda: { ...row.agenda, public: e.target.value } })}
            rows={2}
            className={fieldInputClassName}
            style={fieldInputStyle}
          />
        </div>
        <div>
          <Label className={labelClasses} style={labelStyle}>Private notes</Label>
          <Textarea
            value={row.agenda?.private ?? ''}
            onChange={(e) => onChange(index, { agenda: { ...row.agenda, private: e.target.value } })}
            rows={2}
            className={fieldInputClassName}
            style={fieldInputStyle}
            placeholder="Internal only"
          />
        </div>
      </div>
    </div>
  )
}

export default WeeklyPlanRowFields
