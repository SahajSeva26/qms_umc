import type { WizardFormState } from '@/features/projects/wizard.types'
import { formatINR } from '@/utils/formatters'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const labelClasses = 'block text-[10px] font-semibold tracking-widest uppercase mb-2'
const labelStyle = { color: 'var(--qms-text-muted)' }

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
      <div className="grid grid-cols-2 gap-3">
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
            className="text-[13px]"
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
            className="text-[13px]"
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
          className="text-[13px]"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className={labelClasses} style={labelStyle}>GST %</Label>
          <Input type="number" min={0} max={100} step={0.5} value={form.gstPct} onChange={(e) => setField('gstPct', Number(e.target.value))} className="text-[13px]" />
        </div>
        <div>
          <Label className={labelClasses} style={labelStyle}>Additional patient cost (₹ per patient)</Label>
          <Input type="number" value={form.additionalPatientCost || ''} onChange={(e) => setField('additionalPatientCost', Number(e.target.value))} className="text-[13px]" />
        </div>
      </div>

      <div className="rounded-xl border p-3 space-y-1.5 text-[13px]" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-strong)' }}>
        <div className="flex justify-between" style={{ color: 'var(--qms-text-muted)' }}>
          <span>Camp cost × Total camps</span>
          <span>{formatINR(computedValueBeforeGst)}</span>
        </div>
        <div className="flex justify-between" style={{ color: 'var(--qms-text-muted)' }}>
          <span>Value before GST</span>
          <span>{formatINR(form.valueBeforeGst)}</span>
        </div>
        <div className="flex justify-between" style={{ color: 'var(--qms-text-muted)' }}>
          <span>GST @ {form.gstPct}%</span>
          <span>{formatINR(gstAmount)}</span>
        </div>
        <div className="flex justify-between font-bold pt-1.5" style={{ color: 'var(--qms-text)', borderTop: '1px solid var(--qms-border)' }}>
          <span>Total value (incl. GST)</span>
          <span>{formatINR(totalValue)}</span>
        </div>
      </div>
    </div>
  )
}

export default WizardStep3
