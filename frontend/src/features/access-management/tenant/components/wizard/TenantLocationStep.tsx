import { Controller, useFormContext } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import LocationPicker from '@/components/widgets/location-picker/LocationPicker'
import LocationAddressFields from '@/components/widgets/location-picker/LocationAddressFields'
import type { LocationResolutionState } from '@/components/widgets/location-picker/location.types'
import FieldErrorText from '@/components/ui/FieldErrorText'
import { useTenantWizardFieldError } from '@/features/access-management/tenant/components/wizard/TenantWizardValidationContext'
import type { TenantFormValues } from '@/features/access-management/tenant/tenant.wizard'

interface TenantLocationStepProps {
  setLocationResolution: (v: LocationResolutionState) => void
  locationHint: string | null
  setLocationHint: (v: string | null) => void
}

// locationResolution itself stays owned by the coordinator (its onSubmit/footer also gate on it)
// — this step only needs the setter, to report resolution changes back up.
const TenantLocationStep = ({ setLocationResolution, locationHint, setLocationHint }: TenantLocationStepProps) => {
  const { control } = useFormContext<TenantFormValues>()
  const fieldError = useTenantWizardFieldError()

  return (
    <div>
      <h3 className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
        Company location
      </h3>
      <div className="space-y-3">
        <div>
          <Label className="text-xs mb-1.5">
            Address (optional)
          </Label>
          <Controller
            control={control}
            name="address"
            render={({ field }) => (
              <div className="space-y-2">
                <LocationPicker
                  value={field.value}
                  onChange={field.onChange}
                  onResolutionStateChange={setLocationResolution}
                  onLocationHintChange={setLocationHint}
                  defaultCountry="India"
                  countryCode="IN"
                />
                <LocationAddressFields value={field.value} onChange={field.onChange} defaultCountry="India" locationHint={locationHint} />
              </div>
            )}
          />
          {fieldError('address') && <FieldErrorText message={fieldError('address')!} />}
        </div>
      </div>
    </div>
  )
}

export default TenantLocationStep
