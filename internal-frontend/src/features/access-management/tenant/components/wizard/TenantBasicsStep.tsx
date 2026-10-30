import { Controller, useFormContext } from 'react-hook-form'
import { FiCheckCircle } from 'react-icons/fi'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAsyncPickerState } from '@/hooks/useAsyncPickerState'
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
  const { pickerOpened, setPickerOpened, query, setQuery, platformTenant, salesReps, salesRepsBusy, salesRepsErroredOut } = salesRepPicker
  const { open, setOpen, containerRef } = useAsyncPickerState()

  return (
    <div>
      <h3 className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
        Company details
      </h3>
      <div className="space-y-3">
        <CreateTenantLogoFlow flow={logoFlow} variant="picker" />
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
        <div ref={containerRef} className="relative">
          <Label htmlFor="salesPerson" className="text-xs mb-1.5">
            Sales rep *
          </Label>
          <Controller
            control={control}
            name="salesPerson"
            render={({ field }) => {
              const picked = salesReps.find((role) => role.id === field.value)
              return (
                <>
                  <Input
                    id="salesPerson"
                    type="text"
                    autoComplete="off"
                    value={open ? query : picked ? `${picked.name} (${picked.code})` : ''}
                    placeholder={salesRepsBusy ? 'Loading...' : 'Search sales rep by name...'}
                    onFocus={() => { setPickerOpened(true); setOpen(true); setQuery('') }}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {open && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-50 p-1.5 rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 max-h-56 overflow-y-auto">
                      {salesRepsBusy && (
                        <div className="text-[12px] px-2 py-2" style={{ color: 'var(--qms-text-muted)' }}>Searching…</div>
                      )}
                      {!salesRepsBusy && !salesRepsErroredOut && platformTenant && salesReps.length === 0 && (
                        <div className="text-[12px] px-2 py-2" style={{ color: 'var(--qms-text-muted)' }}>
                          {query.trim() ? `No sales reps match "${query.trim()}".` : 'No active sales reps are available.'}
                        </div>
                      )}
                      {!salesRepsBusy && salesReps.map((r) => {
                        const active = field.value === r.id
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              field.onChange(r.id)
                              setOpen(false)
                              setQuery('')
                            }}
                            className="w-full flex items-center justify-between gap-2 text-left text-[13px] px-2 py-1.5 rounded-md transition-colors hover:bg-(--qms-surface-hover)"
                            style={{ color: 'var(--qms-text)' }}
                          >
                            <span className="truncate">{r.name} ({r.code})</span>
                            {active && <FiCheckCircle size={14} style={{ color: 'var(--qms-brand)' }} className="shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </>
              )
            }}
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
