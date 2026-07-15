import type { WizardFormState } from '@/features/projects/wizard.types'
import { formatINR } from '@/utils/formatters'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { labelClasses, labelStyle, fieldClasses } from '@/features/projects/components/wizard/wizard.styles'

interface WizardStep3Props {
  form: WizardFormState
  setField: <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => void
}

const WizardStep3 = ({ form, setField }: WizardStep3Props) => {
  const computedValueBeforeGst = form.campCost * form.totalCamps
  const gstAmount = Math.round(form.valueBeforeGst * (form.gstPct / 100))
  const totalValue = form.valueBeforeGst + gstAmount

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <Label className={labelClasses} style={labelStyle}>Camp cost (₹ per camp)</Label>
          <Input
            type="number"
            value={form.campCost || ''}
            onChange={(e) => {
              const campCost = Number(e.target.value)
              setField('campCost', campCost)
              if (!form.valueBeforeGstTouched) setField('valueBeforeGst', campCost * form.totalCamps)
            }}
            className={fieldClasses}
          />
        </div>
        <div>
          <Label className={labelClasses} style={labelStyle}>Total camps</Label>
          <Input
            type="number"
            value={form.totalCamps || ''}
            onChange={(e) => {
              const totalCamps = Number(e.target.value)
              setField('totalCamps', totalCamps)
              if (!form.valueBeforeGstTouched) setField('valueBeforeGst', form.campCost * totalCamps)
            }}
            className={fieldClasses}
          />
        </div>
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>Value before GST (₹) *</Label>
        <Input
          type="number"
          value={form.valueBeforeGst || ''}
          onChange={(e) => {
            setField('valueBeforeGst', Number(e.target.value))
            setField('valueBeforeGstTouched', true)
          }}
          className={fieldClasses}
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <Label className={labelClasses} style={labelStyle}>GST %</Label>
          <Input type="number" min={0} max={100} step={0.5} value={form.gstPct} onChange={(e) => setField('gstPct', Number(e.target.value))} className={fieldClasses} />
        </div>
        <div>
          <Label className={labelClasses} style={labelStyle}>Additional patient cost (₹ per patient)</Label>
          <Input type="number" value={form.additionalPatientCost || ''} onChange={(e) => setField('additionalPatientCost', Number(e.target.value))} className={fieldClasses} />
        </div>
      </div>

      {/* Matches the prototype's .gst-calc exactly: 2-col grid, diagonal
          brand→teal gradient tint, dashed-top-border total row. */}
      <div
        className="grid grid-cols-2 gap-2 p-3 rounded-xl border text-[12px] mt-1.5"
        style={{
          borderColor: 'var(--qms-border)',
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--qms-brand) 5%, transparent), color-mix(in srgb, var(--qms-teal) 5%, transparent))',
        }}
      >
        <div className="flex justify-between" style={{ color: 'var(--qms-text-soft)' }}>
          <span>Camp cost × Total camps</span>
          <span>{formatINR(computedValueBeforeGst)}</span>
        </div>
        <div className="flex justify-between" style={{ color: 'var(--qms-text-soft)' }}>
          <span>Value before GST (editable)</span>
          <span>{formatINR(form.valueBeforeGst)}</span>
        </div>
        <div className="flex justify-between" style={{ color: 'var(--qms-text-soft)' }}>
          <span>GST @ {form.gstPct}%</span>
          <span>{formatINR(gstAmount)}</span>
        </div>
        <div
          className="flex justify-between font-extrabold text-[13px] pt-1.5"
          style={{ color: 'var(--qms-brand)', borderTop: '1px dashed var(--qms-border)' }}
        >
          <span>Total value (incl. GST)</span>
          <span>{formatINR(totalValue)}</span>
        </div>
      </div>
    </div>
  )
}

export default WizardStep3
