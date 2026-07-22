import type { WizardFormState } from '@/features/crm/wizard.types'
import { computeWizardScore } from '@/features/crm/wizard.types'
import { OWNERS } from '@/features/crm/crm.mock'
import { formatINR } from '@/utils/formatters'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import DatePicker from '@/components/ui/DatePicker'
import { ReviewCard, ReviewGrid, ReviewField } from '@/components/ui/ReviewCard'
import { labelClasses, labelStyle, fieldClasses } from '@/features/crm/components/wizard/wizard.styles'

interface WizardStep4Props {
  form: WizardFormState
  setField: <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => void
}

const WizardStep4 = ({ form, setField }: WizardStep4Props) => {
  const score = computeWizardScore(form)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <Label className={labelClasses} style={labelStyle}>Estimated value (₹)</Label>
          <Input
            type="number"
            value={form.estimatedValue || ''}
            onChange={(e) => setField('estimatedValue', Number(e.target.value))}
            className={fieldClasses}
          />
        </div>
        <div>
          <Label className={labelClasses} style={labelStyle}>Next follow-up date *</Label>
          <DatePicker
            value={form.nextFollowUpDate}
            onChange={(iso) => setField('nextFollowUpDate', iso)}
            className={`w-full ${fieldClasses}`}
          />
        </div>
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>
          Confidence — <span style={{ color: 'var(--qms-brand)', fontWeight: 800 }}>{form.confidencePct}%</span>
        </Label>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={form.confidencePct}
          onChange={(e) => setField('confidencePct', Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>Owner (sales rep)</Label>
        <Select value={form.owner} onValueChange={(v) => setField('owner', v as string)}>
          <SelectTrigger className={`w-full ${fieldClasses}`}><SelectValue placeholder="Select owner..." /></SelectTrigger>
          <SelectContent>
            {OWNERS.map((o) => <SelectItem key={o.name} value={o.name}>{o.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <p className="text-[12px] mt-2" style={{ color: 'var(--qms-text-muted)' }}>
        Lead opens in stage <b>Lead Generation</b>. Transition forward by drag-drop in the kanban, or mark Lost from the drawer.
      </p>

      <ReviewCard>
        <ReviewGrid>
          <ReviewField label="Pharma" value={form.pharmaCompanyName || '—'} />
          <ReviewField label="Division" value={form.divisionName || '—'} />
          <ReviewField label="Focus therapy" value={form.focusTherapies.join(', ') || '—'} />
          <ReviewField label="Brands" value={form.brandNames.join(', ') || '—'} />
          <ReviewField label="MRs" value={form.mrCount ? String(form.mrCount) : '—'} />
          <ReviewField label="Project type" value={form.projectType || '—'} />
          <ReviewField label="QMS offer" value={form.qmsOffers.join(', ') || '—'} />
          <ReviewField label="AI score" value={String(score)} />
          <ReviewField label="Value" value={formatINR(form.estimatedValue)} />
        </ReviewGrid>
        {form.problemStatement && (
          <div className="mt-3">
            <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-soft)' }}>Problem statement</div>
            <div className="text-[13px] mt-1 leading-snug" style={{ color: 'var(--qms-text)' }}>{form.problemStatement}</div>
          </div>
        )}
      </ReviewCard>
    </div>
  )
}

export default WizardStep4
