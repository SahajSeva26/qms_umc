import { FiClock, FiXCircle, FiMap, FiMapPin, FiGlobe, FiUsers } from 'react-icons/fi'
import type { WizardFormState } from '@/features/projects/wizard.types'
import { CAMP_TIME_SLOTS, STATES_INDIA, BOOKING_ROLES, GO_LIVE_SCOPES } from '@/types/project.types'
import { PickCard, PickGrid } from '@/components/ui/PickCard'
import SectionHeader from '@/components/ui/SectionHeader'
import { ChipRow, ChipToggle } from '@/components/ui/ChipToggle'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { labelClasses, labelStyle, fieldClasses } from '@/features/projects/components/wizard/wizard.styles'

const SCOPE_ICONS = { STATE: FiMap, CITY: FiMapPin, PAN_INDIA: FiGlobe }

interface WizardStep4Props {
  form: WizardFormState
  setField: <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => void
}

const WizardStep4 = ({ form, setField }: WizardStep4Props) => {
  const toggleSlot = (id: string) => {
    setField('campTimeSlots', form.campTimeSlots.includes(id) ? form.campTimeSlots.filter((s) => s !== id) : [...form.campTimeSlots, id])
  }

  const toggleState = (state: string) => {
    setField('goLiveDetails', form.goLiveDetails.includes(state) ? form.goLiveDetails.filter((s) => s !== state) : [...form.goLiveDetails, state])
  }

  const toggleBookingRole = (id: WizardFormState['bookingHierarchy'][number]) => {
    setField('bookingHierarchy', form.bookingHierarchy.includes(id) ? form.bookingHierarchy.filter((r) => r !== id) : [...form.bookingHierarchy, id])
  }

  return (
    <div className="space-y-1">
      <SectionHeader icon={FiClock} spaced={false}>Camp time slots (multi-select)</SectionHeader>
      <ChipRow>
        {CAMP_TIME_SLOTS.map((slot) => (
          <ChipToggle key={slot.id} active={form.campTimeSlots.includes(slot.id)} onClick={() => toggleSlot(slot.id)}>
            {slot.label}
          </ChipToggle>
        ))}
      </ChipRow>

      <SectionHeader icon={FiXCircle}>Cancellation policy</SectionHeader>
      <div className="grid grid-cols-3 gap-2.5">
        <div>
          <Label className={labelClasses} style={labelStyle}>Free-cancel hours prior</Label>
          <Input type="number" value={form.cancellationPolicy.freeHoursPrior} onChange={(e) => setField('cancellationPolicy', { ...form.cancellationPolicy, freeHoursPrior: Number(e.target.value) })} className={fieldClasses} />
        </div>
        <div>
          <Label className={labelClasses} style={labelStyle}>% cancellations allowed</Label>
          <Input type="number" value={form.cancellationPolicy.pctAllowed} onChange={(e) => setField('cancellationPolicy', { ...form.cancellationPolicy, pctAllowed: Number(e.target.value) })} className={fieldClasses} />
        </div>
        <div>
          <Label className={labelClasses} style={labelStyle}>% deducted on chargeable cancel</Label>
          <Input type="number" value={form.cancellationPolicy.pctDeducted} onChange={(e) => setField('cancellationPolicy', { ...form.cancellationPolicy, pctDeducted: Number(e.target.value) })} className={fieldClasses} />
        </div>
      </div>

      <SectionHeader icon={FiGlobe}>Go-live scope</SectionHeader>
      <PickGrid>
        {GO_LIVE_SCOPES.map((s) => (
          <PickCard
            key={s.id}
            active={form.goLiveScope === s.id}
            label={s.label}
            icon={SCOPE_ICONS[s.id]}
            onClick={() => { setField('goLiveScope', s.id); setField('goLiveDetails', []) }}
          />
        ))}
      </PickGrid>

      {form.goLiveScope === 'STATE' && (
        <div className="mt-2">
          <SectionHeader icon={FiMap} spaced={false}>States</SectionHeader>
          <ChipRow>
            {STATES_INDIA.map((state) => (
              <ChipToggle key={state} active={form.goLiveDetails.includes(state)} onClick={() => toggleState(state)}>
                {state}
              </ChipToggle>
            ))}
          </ChipRow>
        </div>
      )}
      {form.goLiveScope === 'CITY' && (
        <div className="mt-2">
          <SectionHeader icon={FiMapPin} spaced={false}>Cities (one per line)</SectionHeader>
          <Textarea
            className={fieldClasses}
            rows={3}
            placeholder="One city per line"
            value={form.goLiveDetails.join('\n')}
            onChange={(e) => setField('goLiveDetails', e.target.value.split('\n').map((c) => c.trim()).filter(Boolean))}
          />
        </div>
      )}
      {form.goLiveScope === 'PAN_INDIA' && (
        <p className="mt-2 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
          Serviceability checks bypassed for unserviceable markets.
        </p>
      )}

      <SectionHeader icon={FiUsers}>Who can book the camp (combination)</SectionHeader>
      <PickGrid>
        {BOOKING_ROLES.map((role) => (
          <PickCard
            key={role.id}
            active={form.bookingHierarchy.includes(role.id)}
            label={role.label}
            desc={role.desc}
            initials={role.label}
            tileColor="rgba(59,109,255,.15)"
            tileTextColor="var(--qms-brand)"
            onClick={() => toggleBookingRole(role.id)}
          />
        ))}
      </PickGrid>
    </div>
  )
}

export default WizardStep4
