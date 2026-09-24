import { Controller, useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useTenantWizardFieldError } from '@/features/access-management/tenant/components/wizard/TenantWizardValidationContext'
import CreateTenantLogoFlow from '@/features/access-management/tenant/components/wizard/CreateTenantLogoFlow'
import type { useTenantSalesRepPicker } from '@/features/access-management/tenant/hooks/useTenantSalesRepPicker'
import type { CreateTenantLogoFlowApi } from '@/features/access-management/tenant/hooks/useCreateTenantLogoFlow'
import type { TenantFormValues } from '@/features/access-management/tenant/tenant.wizard'

interface TenantBasicsStepProps {
  salesRepPicker: ReturnType<typeof useTenantSalesRepPicker>
  logoFlow: CreateTenantLogoFlowApi
}

const TenantBasicsStep = ({ salesRepPicker, logoFlow }: TenantBasicsStepProps) => {
  const { register, control } = useFormContext<TenantFormValues>()
  const fieldError = useTenantWizardFieldError()
  const { pickerOpened, setPickerOpened, platformTenant, salesReps, salesRepsBusy, salesRepsErroredOut } = salesRepPicker

  return (
    <div>
      <h3 className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
        Company details
      </h3>
      <div className="space-y-3">
        <CreateTenantLogoFlow flow={logoFlow} variant="picker" />
        <div>
          <Label htmlFor="tenantCode" className="text-xs mb-1.5">
            Code *
          </Label>
          <Input id="tenantCode" type="text" placeholder="e.g. acme-pharma" {...register('code')} />
          {fieldError('code') && <p className="text-[11px] mt-1 text-danger">{fieldError('code')}</p>}
        </div>
        <div>
          <Label htmlFor="tenantName" className="text-xs mb-1.5">
            Name *
          </Label>
          <Input id="tenantName" type="text" placeholder="e.g. Acme Pharma" {...register('name')} />
          {fieldError('name') && <p className="text-[11px] mt-1 text-danger">{fieldError('name')}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="businessLifetime" className="text-xs mb-1.5">
              Business lifetime (years)
            </Label>
            <Input id="businessLifetime" type="number" placeholder="Optional" {...register('businessLifetime')} />
            {fieldError('businessLifetime') && <p className="text-[11px] mt-1 text-danger">{fieldError('businessLifetime')}</p>}
          </div>
          <div>
            <Label htmlFor="gst" className="text-xs mb-1.5">
              GST number
            </Label>
            <Input id="gst" type="text" placeholder="27AAPFU0939F1ZV" {...register('gst')} />
            {fieldError('gst') && <p className="text-[11px] mt-1 text-danger">{fieldError('gst')}</p>}
          </div>
        </div>
        <div>
          <Label htmlFor="salesPerson" className="text-xs mb-1.5">
            Sales rep *
          </Label>
          <Controller
            control={control}
            name="salesPerson"
            render={({ field }) => (
              <Select
                key={field.value || 'empty'}
                value={field.value || undefined}
                onValueChange={field.onChange}
                onOpenChange={(next) => next && setPickerOpened(true)}
              >
                <SelectTrigger id="salesPerson" className="w-full">
                  <SelectValue placeholder={salesRepsBusy ? 'Loading...' : 'Select sales rep...'}>
                    {(v: string) => {
                      const r = salesReps.find((role) => role.id === v)
                      return r ? `${r.name} (${r.code})` : salesRepsBusy ? 'Loading...' : 'Select sales rep...'
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {salesReps.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
          {fieldError('salesPerson') && <p className="text-[11px] mt-1 text-danger">{fieldError('salesPerson')}</p>}
          {pickerOpened && salesRepsErroredOut && (
            <p className="text-[11px] mt-1 text-danger">Couldn't load sales reps — try again.</p>
          )}
          {pickerOpened && !salesRepsErroredOut && !salesRepsBusy && !platformTenant && (
            <p className="text-[11px] mt-1 text-danger">No QMS internal (platform) company found — a sales rep must belong to one.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default TenantBasicsStep
