import { useState } from 'react'
import { FiAlertTriangle } from 'react-icons/fi'
import type { CampDraft } from '@/features/camps/hooks/useCampDraft'
import CampFoPicker from '@/features/camps/components/CampFoPicker'
import CampMrPicker from '@/features/camps/components/CampMrPicker'
import CampDoctorSearchPicker from '@/features/camps/components/CampDoctorSearchPicker'
import InventoryMasterMultiPicker from '@/features/inventory/real/components/InventoryMasterMultiPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import DatePicker from '@/components/ui/DatePicker'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CAMP_TYPE_LABEL, CAMP_TYPE_VALUES } from '@/types/campReal.types'
import type { BillingType, CampType } from '@/types/campReal.types'
import type { DoctorEntity } from '@/types/doctor.types'
import { DOCTOR_RANGE_KM } from '@/types/doctor.types'
import { CAMP_TIME_SLOT_LABEL } from '@/types/campTimeSlot.constants'
import type { CampTimeSlotValue } from '@/types/campTimeSlot.constants'
import type { LocationValue } from '@/types/location.types'
import LocationPicker from '@/components/widgets/location-picker/LocationPicker'
import LocationAddressFields from '@/components/widgets/location-picker/LocationAddressFields'
import type { LocationResolutionState } from '@/components/widgets/location-picker/location.types'
import { haversineDistanceKm } from '@/utils/geo'

const TYPE_OPTIONS: { value: CampType; label: string }[] = CAMP_TYPE_VALUES.map((value) => ({ value, label: CAMP_TYPE_LABEL[value] }))

// Navigation range only, not a business rule — the backend has no min/max on this field.
const CAMP_DATE_START_MONTH = new Date(new Date().getFullYear() - 10, 0)
const CAMP_DATE_END_MONTH = new Date(new Date().getFullYear() + 10, 11)

const BILLING_OPTIONS: { value: BillingType; label: string }[] = [
  { value: 'billable', label: 'Billable' },
  { value: 'void', label: 'Void' },
]

// Fields shared by create/edit, except Company/Project/Division (create-only). `mode` governs
// the Doctor field: create uses CampDoctorSearchPicker, edit uses the plain pre-fetched <Select>.
interface CampFormFieldsProps {
  mode: 'create' | 'edit'
  draft: CampDraft
  setField: <K extends keyof CampDraft>(key: K, value: CampDraft[K]) => void
  effectiveTenant: string
  isLocked: boolean
  // Locks only the Type select, independent of isLocked (which disables the whole form).
  lockedType?: boolean
  // Narrows Type to the picked project's offered types — matches the backend's hard 400 on project.type.includes(campType).
  allowedTypes?: readonly CampType[]
  // edit-mode only — the pre-fetched doctors list for the plain <Select>.
  doctors?: DoctorEntity[]
  // create mode: plain label string (matches mrLabel/foLabel). edit mode: id->label resolver.
  doctorLabel: string | ((id: string) => string)
  setDoctorLabel?: (label: string) => void
  showNewDoctorButton: boolean
  // Until a Division is picked, "New doctor" would fall back to an unconstrained tenant-wide picker instead of staying camp-scoped.
  newDoctorDisabled?: boolean
  onNewDoctor: () => void
  bookableSlots: CampTimeSlotValue[]
  timeSlotDisabledPlaceholder: string
  mrLabel: string
  setMrLabel: (label: string) => void
  foLabel: string
  setFoLabel: (label: string) => void
  dietitianLabel: string
  setDietitianLabel: (label: string) => void
  /** Called whenever the Type select changes (create mode only — edit mode locks it) so the
   * caller can clear the now-irrelevant worker field (fo or dietitian) and its label. */
  onTypeChange?: (type: CampType) => void
  deviceLabels: Record<string, string>
  onDevicesChange: (ids: string[], labels: Record<string, string>) => void
  onLocationResolutionChange: (state: LocationResolutionState) => void
}

const CampFormFields = ({
  mode,
  draft,
  setField,
  effectiveTenant,
  isLocked,
  lockedType = false,
  allowedTypes = CAMP_TYPE_VALUES,
  doctors = [],
  doctorLabel,
  setDoctorLabel,
  showNewDoctorButton,
  newDoctorDisabled = false,
  onNewDoctor,
  bookableSlots,
  timeSlotDisabledPlaceholder,
  mrLabel,
  setMrLabel,
  foLabel,
  setFoLabel,
  dietitianLabel,
  setDietitianLabel,
  onTypeChange,
  deviceLabels,
  onDevicesChange,
  onLocationResolutionChange,
}: CampFormFieldsProps) => {
  const { doctor, division, type, billingType, patientExpectation, date, timeSlot, location, fo, dietitian, mr, devices, notes } = draft
  const isDiet = type === 'diet'
  const deviceIds = devices ? devices.split(',').map((d) => d.trim()).filter(Boolean) : []
  const [locationHint, setLocationHint] = useState<string | null>(null)

  // Create-mode only — defaults the camp location to the picked doctor's own address, and flags
  // (rather than silently keeping) a doctor who falls out of range after a manual location edit.
  // Edit mode keeps its existing flat layout; an already-placed camp has no "pick order" to enforce.
  const [doctorLocation, setDoctorLocation] = useState<LocationValue | null>(null)
  const [doctorOutOfRange, setDoctorOutOfRange] = useState(false)

  const handleSelectDoctor = (picked: DoctorEntity | null) => {
    setDoctorOutOfRange(false)
    if (!picked?.location) {
      setDoctorLocation(null)
      return
    }
    setDoctorLocation(picked.location)
    // Goes straight through setField, NOT handleLocationChange below — this is the doctor-driven
    // default itself, so it must never immediately re-trigger its own out-of-range check.
    setField('location', picked.location)
  }

  // Only a call to THIS function (never handleSelectDoctor's direct setField above) re-checks the
  // picked doctor's range, since only this path is a genuine user-driven location edit.
  const handleLocationChange = (v: LocationValue) => {
    setField('location', v)
    if (v.coordinates && doctorLocation?.coordinates) {
      const kmAway = haversineDistanceKm(doctorLocation.coordinates, v.coordinates)
      if (kmAway > DOCTOR_RANGE_KM) {
        setField('doctor', '')
        setDoctorLabel?.('')
        setDoctorLocation(null)
        setDoctorOutOfRange(true)
      }
    }
  }

  const editDoctorLabel = (id: string) => {
    if (typeof doctorLabel !== 'function') return id
    if (id) return doctorLabel(id)
    return effectiveTenant ? 'Select doctor' : 'Select company first'
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Type</Label>
          {/* Immutable after create (backend's update schema has no type field at all) — always
              locked in edit mode, not just when isLocked/lockedType. */}
          <Select
            value={type}
            onValueChange={(v) => { const next = v as CampType; setField('type', next); onTypeChange?.(next) }}
            disabled={isLocked || lockedType || mode === 'edit'}
          >
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS
                // Always include the camp's CURRENT type even if the project no longer offers it (e.g.
                // editing a camp whose project's offerings changed since) — never hide the selected value.
                .filter((t) => allowedTypes.includes(t.value) || t.value === type)
                .map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {mode === 'edit' && !isLocked && (
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
              Type can't be changed after a camp is created.
            </p>
          )}
          {mode === 'create' && lockedType && !isLocked && (
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
              Set from the page you booked this camp from.
            </p>
          )}
        </div>
        <div>
          <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Billing</Label>
          <Select value={billingType} onValueChange={(v) => setField('billingType', v as BillingType)} disabled={isLocked}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {BILLING_OPTIONS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Patient expectation</Label>
        <Input type="text" inputMode="numeric" value={patientExpectation} onChange={(e) => setField('patientExpectation', e.target.value)} placeholder="e.g. 50" disabled={isLocked} />
      </div>

      <div>
        <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>MR *</Label>
        {/* Clearing this picker and saving is blocked by the caller's save validation. */}
        <CampMrPicker
          value={mr}
          label={mrLabel}
          tenant={effectiveTenant || undefined}
          onChange={(id, l) => { setField('mr', id); setMrLabel(l) }}
          disabled={isLocked || !effectiveTenant}
        />
      </div>

      <div>
        <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Doctor *</Label>
        <div className="flex items-center gap-2">
          {mode === 'create' ? (
            <CampDoctorSearchPicker
              value={doctor}
              label={typeof doctorLabel === 'string' ? doctorLabel : ''}
              division={division || undefined}
              onChange={(id, label) => { setField('doctor', id); setDoctorLabel?.(label) }}
              onSelectDoctor={handleSelectDoctor}
              disabled={isLocked}
            />
          ) : (
            /* key forces a remount on undefined->defined transitions — base-ui's Select
                otherwise keeps treating it as uncontrolled after the first render. */
            <Select key={doctor || 'empty'} value={doctor || undefined} onValueChange={(v) => setField('doctor', v ?? '')} disabled={isLocked || !effectiveTenant}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={effectiveTenant ? 'Select doctor' : 'Select company first'}>{(v) => editDoctorLabel(v as string)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name} ({d.pharmaCode})</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {mode === 'create' && showNewDoctorButton && (
            <Button type="button" variant="outline" disabled={isLocked || !effectiveTenant || newDoctorDisabled} onClick={onNewDoctor}>
              New doctor
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Location</Label>
        {mode === 'create' && doctorOutOfRange && (
          <div className="flex items-start gap-1.5 text-[12px] rounded-lg px-3 py-2 bg-danger-soft border border-danger text-danger">
            <FiAlertTriangle size={13} className="mt-0.5 shrink-0" />
            <span>The previously picked doctor isn't within {DOCTOR_RANGE_KM}km of this location — pick a doctor near the new location instead.</span>
          </div>
        )}
        {mode === 'create' && !doctorOutOfRange && !location?.coordinates && (
          <p className="text-[12px] rounded-lg px-3 py-2 bg-muted/50" style={{ color: 'var(--qms-text-muted)' }}>
            Defaults to the picked doctor's address — pick a doctor above, or set a location directly.
          </p>
        )}
        <LocationPicker
          value={location}
          onChange={mode === 'create' ? handleLocationChange : (v: LocationValue) => setField('location', v)}
          onResolutionStateChange={onLocationResolutionChange}
          onLocationHintChange={setLocationHint}
          disabled={isLocked}
          defaultCountry="India"
          countryCode="IN"
        />
        <LocationAddressFields
          value={location}
          onChange={mode === 'create' ? handleLocationChange : (v: LocationValue) => setField('location', v)}
          disabled={isLocked}
          defaultCountry="India"
          locationHint={locationHint}
        />
      </div>

      <div>
        <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
          {isDiet ? 'Dietitian' : 'Field Officer'} (optional — auto-assigned if blank)
        </Label>
        <p className="text-[11px] mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>
          The camp location above is used to auto-allocate the nearest available {isDiet ? 'dietitian' : 'field officer'} if none is picked here.
        </p>
        {isDiet ? (
          <CampFoPicker
            workerType="dietitian"
            value={dietitian}
            label={dietitianLabel}
            coordinates={location?.coordinates}
            date={date}
            timeSlot={timeSlot}
            onChange={(id, l) => { setField('dietitian', id); setDietitianLabel(l) }}
            disabled={isLocked || !effectiveTenant}
          />
        ) : (
          <CampFoPicker
            value={fo}
            label={foLabel}
            coordinates={location?.coordinates}
            date={date}
            timeSlot={timeSlot}
            onChange={(id, l) => { setField('fo', id); setFoLabel(l) }}
            disabled={isLocked || !effectiveTenant}
          />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Date</Label>
          <DatePicker
            value={date}
            onChange={(v) => setField('date', v)}
            className="w-full"
            disabled={isLocked}
            startMonth={CAMP_DATE_START_MONTH}
            endMonth={CAMP_DATE_END_MONTH}
          />
        </div>
        <div>
          <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Time slot *</Label>
          <Select
            key={timeSlot || 'empty'}
            value={timeSlot || undefined}
            onValueChange={(v) => setField('timeSlot', v as CampTimeSlotValue)}
            disabled={isLocked || bookableSlots.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={bookableSlots.length === 0 ? timeSlotDisabledPlaceholder : 'Select time slot'}>
                {(v) => CAMP_TIME_SLOT_LABEL[v as CampTimeSlotValue]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {bookableSlots.map((slot) => <SelectItem key={slot} value={slot}>{CAMP_TIME_SLOT_LABEL[slot]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Devices</Label>
        <InventoryMasterMultiPicker value={deviceIds} labels={deviceLabels} onChange={onDevicesChange} type="device" disabled={isLocked} />
      </div>

      <div>
        <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Notes</Label>
        <Textarea value={notes} onChange={(e) => setField('notes', e.target.value)} placeholder="Optional" disabled={isLocked} />
      </div>
    </div>
  )
}

export default CampFormFields
