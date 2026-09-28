import { useState } from 'react'
import type { CampDraft } from '@/features/camps/hooks/useCampDraft'
import CampFoPicker from '@/features/camps/components/CampFoPicker'
import CampMrPicker from '@/features/camps/components/CampMrPicker'
import CampDoctorSearchPicker from '@/features/camps/components/CampDoctorSearchPicker'
import InventoryMasterMultiPicker from '@/features/inventory/real/components/InventoryMasterMultiPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CAMP_TYPE_LABEL, CAMP_TYPE_VALUES } from '@/types/campReal.types'
import type { BillingType, CampType } from '@/types/campReal.types'
import type { DoctorEntity } from '@/types/doctor.types'
import { CAMP_TIME_SLOT_LABEL } from '@/types/campTimeSlot.constants'
import type { CampTimeSlotValue } from '@/types/campTimeSlot.constants'
import type { LocationValue } from '@/types/location.types'
import LocationPicker from '@/components/widgets/location-picker/LocationPicker'
import LocationAddressFields from '@/components/widgets/location-picker/LocationAddressFields'
import type { LocationResolutionState } from '@/components/widgets/location-picker/location.types'

const TYPE_OPTIONS: { value: CampType; label: string }[] = CAMP_TYPE_VALUES.map((value) => ({ value, label: CAMP_TYPE_LABEL[value] }))

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
  // edit-mode only — the pre-fetched doctors list for the plain <Select>.
  doctors?: DoctorEntity[]
  // create mode: plain label string (matches mrLabel/foLabel). edit mode: id->label resolver.
  doctorLabel: string | ((id: string) => string)
  setDoctorLabel?: (label: string) => void
  showNewDoctorButton: boolean
  // A new doctor must be created scoped to a known division — until one is picked
  // (create mode: the Division field), "New doctor" would fall back to an
  // unconstrained tenant-wide division picker instead of staying camp-scoped.
  newDoctorDisabled?: boolean
  onNewDoctor: () => void
  bookableSlots: CampTimeSlotValue[]
  timeSlotDisabledPlaceholder: string
  mrLabel: string
  setMrLabel: (label: string) => void
  foLabel: string
  setFoLabel: (label: string) => void
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
  deviceLabels,
  onDevicesChange,
  onLocationResolutionChange,
}: CampFormFieldsProps) => {
  const { doctor, division, type, billingType, patientExpectation, date, timeSlot, location, fo, mr, devices, notes } = draft
  const deviceIds = devices ? devices.split(',').map((d) => d.trim()).filter(Boolean) : []
  const [locationHint, setLocationHint] = useState<string | null>(null)

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
          <Select value={type} onValueChange={(v) => setField('type', v as CampType)} disabled={isLocked || lockedType}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {lockedType && !isLocked && (
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Date</Label>
          <Input type="date" value={date} onChange={(e) => setField('date', e.target.value)} disabled={isLocked} />
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

      <div className="space-y-2">
        <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Location</Label>
        <LocationPicker
          value={location}
          onChange={(v: LocationValue) => setField('location', v)}
          onResolutionStateChange={onLocationResolutionChange}
          onLocationHintChange={setLocationHint}
          disabled={isLocked}
          defaultCountry="India"
          countryCode="IN"
        />
        <LocationAddressFields value={location} onChange={(v: LocationValue) => setField('location', v)} disabled={isLocked} defaultCountry="India" locationHint={locationHint} />
      </div>
      <p className="text-[11px] -mt-2" style={{ color: 'var(--qms-text-muted)' }}>
        Used to auto-allocate the nearest available field officer if none is picked below.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Doctor *</Label>
          <div className="flex items-center gap-2">
            {mode === 'create' ? (
              <CampDoctorSearchPicker
                value={doctor}
                label={typeof doctorLabel === 'string' ? doctorLabel : ''}
                division={division || undefined}
                onChange={(id, label) => { setField('doctor', id); setDoctorLabel?.(label) }}
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
        <div>
          <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
            Field Officer (optional — auto-assigned if blank)
          </Label>
          <CampFoPicker
            value={fo}
            label={foLabel}
            coordinates={location?.coordinates}
            date={date}
            timeSlot={timeSlot}
            onChange={(id, l) => { setField('fo', id); setFoLabel(l) }}
            disabled={isLocked || !effectiveTenant}
          />
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
