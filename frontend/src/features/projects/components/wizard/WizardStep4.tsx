import type { WizardFormState } from '@/features/projects/wizard.types'
import type { GoLiveScope } from '@/types/project.types'
import { CAMP_TIME_SLOTS, STATES_INDIA, BOOKING_ROLES } from '@/types/project.types'
import ChipPicker from '@/components/ui/ChipPicker'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

const labelClasses = 'block text-[10px] font-semibold tracking-widest uppercase mb-2'
const labelStyle = { color: 'var(--qms-text-muted)' }

const SCOPE_OPTIONS: { id: GoLiveScope; label: string }[] = [
  { id: 'STATE', label: 'Specific states' },
  { id: 'CITY', label: 'Specific cities' },
  { id: 'PAN_INDIA', label: 'PAN-India' },
]

interface WizardStep4Props {
  form: WizardFormState
  setField: <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => void
}

const WizardStep4 = ({ form, setField }: WizardStep4Props) => {
  const toggleSlot = (id: string) => {
    setField('campTimeSlots', form.campTimeSlots.includes(id) ? form.campTimeSlots.filter((s) => s !== id) : [...form.campTimeSlots, id])
  }

  const toggleBookingRole = (id: WizardFormState['bookingHierarchy'][number]) => {
    setField('bookingHierarchy', form.bookingHierarchy.includes(id) ? form.bookingHierarchy.filter((r) => r !== id) : [...form.bookingHierarchy, id])
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className={labelClasses} style={labelStyle}>Camp time slots *</Label>
        <div className="flex flex-wrap gap-1.5">
          {CAMP_TIME_SLOTS.map((slot) => (
            <button
              key={slot.id}
              onClick={() => toggleSlot(slot.id)}
              className="text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-all"
              style={
                form.campTimeSlots.includes(slot.id)
                  ? { background: 'var(--qms-teal)', borderColor: 'var(--qms-teal)', color: '#fff' }
                  : { background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }
              }
            >
              {slot.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>Cancellation policy</Label>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="block text-[10px] mb-1" style={labelStyle}>Free-cancel hours prior</Label>
            <Input type="number" value={form.cancellationPolicy.freeHoursPrior} onChange={(e) => setField('cancellationPolicy', { ...form.cancellationPolicy, freeHoursPrior: Number(e.target.value) })} className="text-[13px]" />
          </div>
          <div>
            <Label className="block text-[10px] mb-1" style={labelStyle}>% cancellations allowed</Label>
            <Input type="number" value={form.cancellationPolicy.pctAllowed} onChange={(e) => setField('cancellationPolicy', { ...form.cancellationPolicy, pctAllowed: Number(e.target.value) })} className="text-[13px]" />
          </div>
          <div>
            <Label className="block text-[10px] mb-1" style={labelStyle}>% deducted on chargeable cancel</Label>
            <Input type="number" value={form.cancellationPolicy.pctDeducted} onChange={(e) => setField('cancellationPolicy', { ...form.cancellationPolicy, pctDeducted: Number(e.target.value) })} className="text-[13px]" />
          </div>
        </div>
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>Go-live scope *</Label>
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
          {SCOPE_OPTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => { setField('goLiveScope', s.id); setField('goLiveDetails', []) }}
              className="px-3 py-2 rounded-xl border transition-all text-[12px] font-semibold"
              style={
                form.goLiveScope === s.id
                  ? { background: 'var(--qms-brand)', borderColor: 'var(--qms-brand)', color: '#fff' }
                  : { background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }
              }
            >
              {s.label}
            </button>
          ))}
        </div>

        {form.goLiveScope === 'STATE' && (
          <div className="mt-3">
            <ChipPicker options={STATES_INDIA} selected={form.goLiveDetails} onChange={(v) => setField('goLiveDetails', v)} placeholder="Add a state..." />
          </div>
        )}
        {form.goLiveScope === 'CITY' && (
          <Textarea
            className="mt-3 text-[13px]"
            rows={3}
            placeholder="One city per line"
            value={form.goLiveDetails.join('\n')}
            onChange={(e) => setField('goLiveDetails', e.target.value.split('\n').map((c) => c.trim()).filter(Boolean))}
          />
        )}
        {form.goLiveScope === 'PAN_INDIA' && (
          <p className="mt-3 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
            Serviceability checks bypassed for unserviceable markets.
          </p>
        )}
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>Who can book the camp (combination) *</Label>
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          {BOOKING_ROLES.map((role) => (
            <button
              key={role.id}
              onClick={() => toggleBookingRole(role.id)}
              className="px-3 py-2 rounded-xl border transition-all text-left"
              style={
                form.bookingHierarchy.includes(role.id)
                  ? { background: 'var(--qms-brand)', borderColor: 'var(--qms-brand)', color: '#fff' }
                  : { background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }
              }
            >
              <div className="text-[12px] font-bold">{role.label}</div>
              <div className="text-[11px] opacity-90">{role.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default WizardStep4
