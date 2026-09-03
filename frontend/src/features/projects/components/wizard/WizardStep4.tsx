import { FiClock, FiXCircle, FiMap, FiMapPin, FiGlobe, FiUsers } from 'react-icons/fi'
import type { WizardFormState } from '@/features/projects/wizard.types'
import type { GoLiveScopeCode, WhoCanBookCampCode } from '@/types/project.types'
import { GO_LIVE_SCOPE_LABEL } from '@/types/project.types'
import { CAMP_TIME_SLOT_VALUES, CAMP_TIME_SLOT_LABEL } from '@/types/campTimeSlot.constants'
import type { CampTimeSlotValue } from '@/types/campTimeSlot.constants'
import { STATES_INDIA } from '@/features/projects/projects.states'
import { ROLE_TYPE_CODE_GROUPS } from '@/features/access-management/role-type/constants/roleTypeCodes'
import { PickCard, PickGrid } from '@/components/ui/PickCard'
import SectionHeader from '@/components/ui/SectionHeader'
import { ChipRow, ChipToggle } from '@/components/ui/ChipToggle'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { labelClasses, labelStyle, fieldClasses } from '@/features/projects/components/wizard/wizard.styles'

const SCOPE_ICONS: Record<GoLiveScopeCode, typeof FiMap> = { states: FiMap, cities: FiMapPin, pan: FiGlobe }
const SCOPE_OPTIONS: GoLiveScopeCode[] = ['states', 'cities', 'pan']

// Backend's whoCanBookCamp enum is ALLOWED_ROLETYPE_CODES.CUSTOMER. The
// "Customer" group here is always exactly that 4-code subset, so this cast is safe.
const BOOKING_ROLE_OPTIONS = (ROLE_TYPE_CODE_GROUPS.find((g) => g.label === 'Customer')?.codes ?? []) as WhoCanBookCampCode[]

interface WizardStep4Props {
  form: WizardFormState
  setField: <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => void
}

const WizardStep4 = ({ form, setField }: WizardStep4Props) => {
  const toggleSlot = (slot: CampTimeSlotValue) => {
    setField(
      'campTimeSlots',
      form.campTimeSlots.includes(slot)
        ? form.campTimeSlots.filter((s) => s !== slot)
        : [...form.campTimeSlots, slot],
    )
  }

  const toggleState = (state: string) => {
    setField('goLiveScopeValues', form.goLiveScopeValues.includes(state) ? form.goLiveScopeValues.filter((s) => s !== state) : [...form.goLiveScopeValues, state])
  }

  const toggleBookingRole = (code: WhoCanBookCampCode) => {
    setField('whoCanBookCamp', form.whoCanBookCamp.includes(code) ? form.whoCanBookCamp.filter((r) => r !== code) : [...form.whoCanBookCamp, code])
  }

  return (
    <div className="space-y-1">
      <SectionHeader icon={FiClock} spaced={false}>Camp time slots (multi-select) *</SectionHeader>
      <ChipRow>
        {CAMP_TIME_SLOT_VALUES.map((slot) => (
          <ChipToggle key={slot} active={form.campTimeSlots.includes(slot)} onClick={() => toggleSlot(slot)}>
            {CAMP_TIME_SLOT_LABEL[slot]}
          </ChipToggle>
        ))}
      </ChipRow>

      <SectionHeader icon={FiXCircle}>Cancellation policy</SectionHeader>
      <div className="grid grid-cols-3 gap-2.5">
        <div>
          <Label className={labelClasses} style={labelStyle}>Free-cancel hours prior</Label>
          <Input type="number" value={String(form.freeCancelHours)} onChange={(e) => setField('freeCancelHours', Number(e.target.value))} className={fieldClasses} />
        </div>
        <div>
          <Label className={labelClasses} style={labelStyle}>% cancellations allowed</Label>
          <Input type="number" min={0} max={100} value={String(form.cancellationAllowed)} onChange={(e) => setField('cancellationAllowed', Number(e.target.value))} className={fieldClasses} />
        </div>
        <div>
          <Label className={labelClasses} style={labelStyle}>% deducted on chargeable cancel</Label>
          <Input type="number" min={0} max={100} value={String(form.campCostDeductionOnChargableCancel)} onChange={(e) => setField('campCostDeductionOnChargableCancel', Number(e.target.value))} className={fieldClasses} />
        </div>
      </div>

      <SectionHeader icon={FiGlobe}>Go-live scope</SectionHeader>
      <PickGrid>
        {SCOPE_OPTIONS.map((s) => (
          <PickCard
            key={s}
            active={form.goLiveScopeCode === s}
            label={GO_LIVE_SCOPE_LABEL[s]}
            icon={SCOPE_ICONS[s]}
            onClick={() => { setField('goLiveScopeCode', s); setField('goLiveScopeValues', []) }}
          />
        ))}
      </PickGrid>

      {form.goLiveScopeCode === 'states' && (
        <div className="mt-2">
          <SectionHeader icon={FiMap} spaced={false}>States</SectionHeader>
          <ChipRow>
            {STATES_INDIA.map((state) => (
              <ChipToggle key={state} active={form.goLiveScopeValues.includes(state)} onClick={() => toggleState(state)}>
                {state}
              </ChipToggle>
            ))}
          </ChipRow>
        </div>
      )}
      {form.goLiveScopeCode === 'cities' && (
        <div className="mt-2">
          <SectionHeader icon={FiMapPin} spaced={false}>Cities (one per line)</SectionHeader>
          <Textarea
            className={fieldClasses}
            rows={3}
            placeholder="One city per line"
            value={form.goLiveScopeValues.join('\n')}
            onChange={(e) => setField('goLiveScopeValues', e.target.value.split('\n').map((c) => c.trim()).filter(Boolean))}
          />
        </div>
      )}
      {form.goLiveScopeCode === 'pan' && (
        <p className="mt-2 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
          Serviceability checks bypassed for unserviceable markets.
        </p>
      )}

      <SectionHeader icon={FiUsers}>Who can book the camp (multi-select)</SectionHeader>
      <PickGrid>
        {BOOKING_ROLE_OPTIONS.map((code) => (
          <PickCard
            key={code}
            active={form.whoCanBookCamp.includes(code)}
            label={code}
            initials={code.slice(0, 2).toUpperCase()}
            tileColor="rgba(59,109,255,.15)"
            tileTextColor="var(--qms-brand)"
            onClick={() => toggleBookingRole(code)}
          />
        ))}
      </PickGrid>
    </div>
  )
}

export default WizardStep4
