import { useId } from 'react'
import { Input } from '../primitives/Input'
import { Label } from '../primitives/Label'
import { createEmptyLocationValue, type LocationValue } from '@qms/core'
import { REQUIRED_ADDRESS_FIELDS } from './location.types'

interface LocationAddressFieldsProps {
  value: LocationValue | null
  onChange: (value: LocationValue) => void
  disabled?: boolean
  defaultCountry?: string
  // Google's best-effort description of the point — read-only, never written to a field.
  locationHint?: string | null
}

const LocationAddressFields = ({ value, onChange, disabled, defaultCountry, locationHint }: LocationAddressFieldsProps) => {
  const idPrefix = useId()
  const current = value ?? createEmptyLocationValue(defaultCountry)

  const setField = <K extends keyof LocationValue>(key: K, v: LocationValue[K]) => {
    onChange({ ...current, [key]: v })
  }

  const missingRequired = value ? REQUIRED_ADDRESS_FIELDS.filter((f) => !current[f.key].trim()) : []

  return (
    <div className="space-y-3">
      {missingRequired.length > 0 && (
        <>
          <p className="text-[12px] rounded-lg px-3 py-2 border border-warning bg-warning-soft text-warning">
            Complete the address below ({missingRequired.map((f) => f.label).join(', ')} missing).
          </p>
          {locationHint && (
            <p className="text-[12px] rounded-lg px-3 py-2 border" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
              <span className="font-semibold uppercase tracking-wide text-[10px] block mb-0.5" style={{ color: 'var(--qms-text-soft)' }}>Map location</span>
              {locationHint}
            </p>
          )}
        </>
      )}

      <div>
        <Label htmlFor={`${idPrefix}-addressLine1`} className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block text-qms-text-muted">Address line 1</Label>
        <Input
          id={`${idPrefix}-addressLine1`}
          value={current.addressLine1}
          onChange={(e) => setField('addressLine1', e.target.value)}
          disabled={disabled}
        />
      </div>

      <div>
        <Label htmlFor={`${idPrefix}-addressLine2`} className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block text-qms-text-muted">Address line 2 (optional)</Label>
        <Input
          id={`${idPrefix}-addressLine2`}
          value={current.addressLine2 ?? ''}
          onChange={(e) => setField('addressLine2', e.target.value)}
          onBlur={(e) => setField('addressLine2', e.target.value.trim() || undefined)}
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`${idPrefix}-locality`} className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block text-qms-text-muted">Locality (optional)</Label>
          <Input
            id={`${idPrefix}-locality`}
            value={current.locality ?? ''}
            onChange={(e) => setField('locality', e.target.value)}
            onBlur={(e) => setField('locality', e.target.value.trim() || undefined)}
            disabled={disabled}
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-city`} className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block text-qms-text-muted">City</Label>
          <Input
            id={`${idPrefix}-city`}
            value={current.city}
            onChange={(e) => setField('city', e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`${idPrefix}-state`} className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block text-qms-text-muted">State</Label>
          <Input
            id={`${idPrefix}-state`}
            value={current.state}
            onChange={(e) => setField('state', e.target.value)}
            disabled={disabled}
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-pincode`} className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block text-qms-text-muted">Pincode</Label>
          <Input
            id={`${idPrefix}-pincode`}
            value={current.pincode}
            onChange={(e) => setField('pincode', e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      <div>
        <Label htmlFor={`${idPrefix}-country`} className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block text-qms-text-muted">Country (optional)</Label>
        <Input
          id={`${idPrefix}-country`}
          value={current.country ?? ''}
          onChange={(e) => setField('country', e.target.value)}
          onBlur={(e) => setField('country', e.target.value.trim() || undefined)}
          disabled={disabled}
        />
      </div>
    </div>
  )
}

export default LocationAddressFields
