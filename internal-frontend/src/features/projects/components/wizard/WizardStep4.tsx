import { useFormContext, useWatch } from 'react-hook-form'
import { FiClock, FiXCircle, FiMap, FiMapPin, FiGlobe, FiUsers } from 'react-icons/fi'
import type { WizardFormState } from '@/features/projects/wizard.types'
import type { GoLiveScopeCode, WhoCanBookCampCode } from '@/types/project.types'
import { GO_LIVE_SCOPE_LABEL } from '@/types/project.types'
import { CAMP_TIME_SLOT_VALUES, CAMP_TIME_SLOT_LABEL } from '@/types/campTimeSlot.constants'
import type { CampTimeSlotValue } from '@/types/campTimeSlot.constants'
import { STATES_INDIA } from '@/features/projects/projects.states'
import { asZeroWhenBlank } from '@/features/projects/projects.utils'
import { ROLE_TYPE_CODE_GROUPS } from '@/features/access-management/role-type/constants/roleTypeCodes'
import { PickCard, PickGrid } from '@/components/ui/PickCard'
import SectionHeader from '@/components/ui/SectionHeader'
import { ChipRow, ChipToggle } from '@/components/ui/ChipToggle'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { labelClasses, labelStyle, fieldClasses } from '@/features/projects/components/wizard/wizard.styles'
import { useWizardFieldError } from '@/features/projects/components/wizard/WizardValidationContext'

const SCOPE_ICONS: Record<GoLiveScopeCode, typeof FiMap> = { states: FiMap, cities: FiMapPin, pan: FiGlobe }
const SCOPE_OPTIONS: GoLiveScopeCode[] = ['states', 'cities', 'pan']

// Backend's whoCanBookCamp enum is ALLOWED_ROLETYPE_CODES.CUSTOMER. The
// "Customer" group here is always exactly that 4-code subset, so this cast is safe.
const BOOKING_ROLE_OPTIONS = (ROLE_TYPE_CODE_GROUPS.find((g) => g.label === 'Customer')?.codes ?? []) as WhoCanBookCampCode[]

const WizardStep4 = () => {
  const { register, control, setValue } = useFormContext<WizardFormState>()
  const fieldError = useWizardFieldError()
  const campTimeSlots = useWatch({ control, name: 'campTimeSlots' })
  const goLiveScopeCode = useWatch({ control, name: 'goLiveScopeCode' })
  const goLiveScopeValues = useWatch({ control, name: 'goLiveScopeValues' })
  const whoCanBookCamp = useWatch({ control, name: 'whoCanBookCamp' })

  const toggleSlot = (slot: CampTimeSlotValue) => {
    setValue(
      'campTimeSlots',
      campTimeSlots.includes(slot) ? campTimeSlots.filter((s) => s !== slot) : [...campTimeSlots, slot],
      { shouldValidate: true, shouldDirty: true },
    )
  }

  const toggleState = (state: string) => {
    setValue(
      'goLiveScopeValues',
      goLiveScopeValues.includes(state) ? goLiveScopeValues.filter((s) => s !== state) : [...goLiveScopeValues, state],
      { shouldValidate: true, shouldDirty: true },
    )
  }

  const toggleBookingRole = (code: WhoCanBookCampCode) => {
    setValue(
      'whoCanBookCamp',
      whoCanBookCamp.includes(code) ? whoCanBookCamp.filter((r) => r !== code) : [...whoCanBookCamp, code],
      { shouldValidate: true, shouldDirty: true },
    )
  }

  return (
    <div className="space-y-1">
      <SectionHeader icon={FiClock} spaced={false}>Camp time slots (multi-select) *</SectionHeader>
      <ChipRow>
        {CAMP_TIME_SLOT_VALUES.map((slot) => (
          <ChipToggle key={slot} active={campTimeSlots.includes(slot)} onClick={() => toggleSlot(slot)}>
            {CAMP_TIME_SLOT_LABEL[slot]}
          </ChipToggle>
        ))}
      </ChipRow>
      {fieldError('campTimeSlots') && <p className="text-[11px] mt-1 text-danger">{fieldError('campTimeSlots')}</p>}

      <SectionHeader icon={FiXCircle}>Cancellation policy</SectionHeader>
      <div className="grid grid-cols-3 gap-2.5">
        <div>
          <Label className={labelClasses} style={labelStyle}>Free-cancel hours prior</Label>
          <Input type="number" {...register('freeCancelHours', { setValueAs: asZeroWhenBlank })} className={fieldClasses} />
        </div>
        <div>
          <Label className={labelClasses} style={labelStyle}>% cancellations allowed</Label>
          <Input type="number" min={0} max={100} {...register('cancellationAllowed', { setValueAs: asZeroWhenBlank })} className={fieldClasses} />
        </div>
        <div>
          <Label className={labelClasses} style={labelStyle}>% deducted on chargeable cancel</Label>
          <Input type="number" min={0} max={100} {...register('campCostDeductionOnChargableCancel', { setValueAs: asZeroWhenBlank })} className={fieldClasses} />
        </div>
      </div>

      <SectionHeader icon={FiGlobe}>Go-live scope</SectionHeader>
      <PickGrid>
        {SCOPE_OPTIONS.map((s) => (
          <PickCard
            key={s}
            active={goLiveScopeCode === s}
            label={GO_LIVE_SCOPE_LABEL[s]}
            icon={SCOPE_ICONS[s]}
            onClick={() => {
              setValue('goLiveScopeCode', s, { shouldValidate: true, shouldDirty: true })
              setValue('goLiveScopeValues', [], { shouldValidate: true, shouldDirty: true })
            }}
          />
        ))}
      </PickGrid>

      {goLiveScopeCode === 'states' && (
        <div className="mt-2">
          <SectionHeader icon={FiMap} spaced={false}>States</SectionHeader>
          <ChipRow>
            {STATES_INDIA.map((state) => (
              <ChipToggle key={state} active={goLiveScopeValues.includes(state)} onClick={() => toggleState(state)}>
                {state}
              </ChipToggle>
            ))}
          </ChipRow>
        </div>
      )}
      {goLiveScopeCode === 'cities' && (
        <div className="mt-2">
          <SectionHeader icon={FiMapPin} spaced={false}>Cities (one per line)</SectionHeader>
          <Textarea
            className={fieldClasses}
            rows={3}
            placeholder="One city per line"
            value={goLiveScopeValues.join('\n')}
            onChange={(e) => setValue('goLiveScopeValues', e.target.value.split('\n').map((c) => c.trim()).filter(Boolean), { shouldValidate: true, shouldDirty: true })}
          />
        </div>
      )}
      {goLiveScopeCode === 'pan' && (
        <p className="mt-2 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
          Serviceability checks bypassed for unserviceable markets.
        </p>
      )}
      {fieldError('goLiveScopeValues') && <p className="text-[11px] mt-1 text-danger">{fieldError('goLiveScopeValues')}</p>}

      <SectionHeader icon={FiUsers}>Who can book the camp (multi-select)</SectionHeader>
      <PickGrid>
        {BOOKING_ROLE_OPTIONS.map((code) => (
          <PickCard
            key={code}
            active={whoCanBookCamp.includes(code)}
            label={code}
            initials={code.slice(0, 2).toUpperCase()}
            tileColor="rgba(59,109,255,.15)"
            tileTextColor="var(--qms-brand)"
            onClick={() => toggleBookingRole(code)}
          />
        ))}
      </PickGrid>
      {fieldError('whoCanBookCamp') && <p className="text-[11px] mt-1 text-danger">{fieldError('whoCanBookCamp')}</p>}
    </div>
  )
}

export default WizardStep4
