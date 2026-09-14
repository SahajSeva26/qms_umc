import { useFormContext, useWatch } from 'react-hook-form'
import type { WizardFormState } from '@/features/projects/wizard.types'
import { computeGstBreakdown, asZeroWhenBlank } from '@/features/projects/projects.utils'
import { formatINR } from '@/utils/formatters'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { labelClasses, labelStyle, fieldClasses } from '@/features/projects/components/wizard/wizard.styles'
import { useWizardFieldError } from '@/features/projects/components/wizard/WizardValidationContext'

const WizardStep3 = () => {
  const { register, control, setValue } = useFormContext<WizardFormState>()
  const fieldError = useWizardFieldError()
  const campCost = useWatch({ control, name: 'campCost' })
  const totalCamps = useWatch({ control, name: 'totalCamps' })
  const valueBeforeGST = useWatch({ control, name: 'valueBeforeGST' })
  const valueBeforeGSTTouched = useWatch({ control, name: 'valueBeforeGSTTouched' })
  const gst = useWatch({ control, name: 'gst' })

  const computedValueBeforeGST = campCost * totalCamps
  const { gstAmount, valueAfterGST } = computeGstBreakdown(valueBeforeGST, gst)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <Label className={labelClasses} style={labelStyle}>Camp cost (₹ per camp)</Label>
          <Input
            type="number"
            {...register('campCost', {
              setValueAs: asZeroWhenBlank,
              onChange: (e) => {
                const nextCampCost = asZeroWhenBlank(e.target.value)
                if (!valueBeforeGSTTouched) setValue('valueBeforeGST', nextCampCost * totalCamps, { shouldValidate: true, shouldDirty: true })
              },
            })}
            className={fieldClasses}
          />
          {fieldError('campCost') && <p className="text-[11px] mt-1 text-danger">{fieldError('campCost')}</p>}
        </div>
        <div>
          <Label className={labelClasses} style={labelStyle}>Total camps</Label>
          <Input
            type="number"
            {...register('totalCamps', {
              setValueAs: asZeroWhenBlank,
              onChange: (e) => {
                const nextTotalCamps = asZeroWhenBlank(e.target.value)
                if (!valueBeforeGSTTouched) setValue('valueBeforeGST', campCost * nextTotalCamps, { shouldValidate: true, shouldDirty: true })
              },
            })}
            className={fieldClasses}
          />
          {fieldError('totalCamps') && <p className="text-[11px] mt-1 text-danger">{fieldError('totalCamps')}</p>}
        </div>
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>Value before GST (₹) *</Label>
        <Input
          type="number"
          {...register('valueBeforeGST', {
            setValueAs: asZeroWhenBlank,
            onChange: () => setValue('valueBeforeGSTTouched', true, { shouldDirty: true }),
          })}
          className={fieldClasses}
        />
        {fieldError('valueBeforeGST') && <p className="text-[11px] mt-1 text-danger">{fieldError('valueBeforeGST')}</p>}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <Label className={labelClasses} style={labelStyle}>GST %</Label>
          <Input type="number" min={0} max={100} step={0.5} {...register('gst', { setValueAs: asZeroWhenBlank })} className={fieldClasses} />
          {fieldError('gst') && <p className="text-[11px] mt-1 text-danger">{fieldError('gst')}</p>}
        </div>
        <div>
          <Label className={labelClasses} style={labelStyle}>Additional cost (₹ per patient)</Label>
          <Input type="number" {...register('additionalCost', { setValueAs: asZeroWhenBlank })} className={fieldClasses} />
          {fieldError('additionalCost') && <p className="text-[11px] mt-1 text-danger">{fieldError('additionalCost')}</p>}
        </div>
      </div>

      <div
        className="grid grid-cols-2 gap-2 p-3 rounded-xl border text-[12px] mt-1.5"
        style={{
          borderColor: 'var(--qms-border)',
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--qms-brand) 5%, transparent), color-mix(in srgb, var(--qms-teal) 5%, transparent))',
        }}
      >
        <div className="flex justify-between" style={{ color: 'var(--qms-text-soft)' }}>
          <span>Camp cost × Total camps</span>
          <span>{formatINR(computedValueBeforeGST)}</span>
        </div>
        <div className="flex justify-between" style={{ color: 'var(--qms-text-soft)' }}>
          <span>Value before GST (editable)</span>
          <span>{formatINR(valueBeforeGST)}</span>
        </div>
        <div className="flex justify-between" style={{ color: 'var(--qms-text-soft)' }}>
          <span>GST @ {gst}%</span>
          <span>{formatINR(gstAmount)}</span>
        </div>
        <div
          className="flex justify-between font-extrabold text-[13px] pt-1.5"
          style={{ color: 'var(--qms-brand)', borderTop: '1px dashed var(--qms-border)' }}
        >
          <span>Total value (incl. GST)</span>
          <span>{formatINR(valueAfterGST)}</span>
        </div>
      </div>
    </div>
  )
}

export default WizardStep3
