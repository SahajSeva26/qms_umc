import type { WizardFormState } from '@/features/crm/wizard.types'
import { computeWizardScore } from '@/features/crm/wizard.types'
import { OWNERS } from '@/features/crm/crm.mock'
import { formatINR } from '@/utils/formatters'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import DatePicker from '@/components/ui/DatePicker'

const labelClasses = 'block text-[10px] font-semibold tracking-widest uppercase mb-2'
const labelStyle = { color: 'var(--qms-text-muted)' }

interface WizardStep4Props {
  form: WizardFormState
  setField: <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => void
}

const WizardStep4 = ({ form, setField }: WizardStep4Props) => {
  const score = computeWizardScore(form)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className={labelClasses} style={labelStyle}>Estimated value (₹)</Label>
          <Input
            type="number"
            value={form.estimatedValue || ''}
            onChange={(e) => setField('estimatedValue', Number(e.target.value))}
            className="text-[13px]"
          />
        </div>
        <div>
          <Label className={labelClasses} style={labelStyle}>Next follow-up date *</Label>
          <DatePicker
            value={form.nextFollowUpDate}
            onChange={(iso) => setField('nextFollowUpDate', iso)}
            className="w-full text-[13px]"
          />
        </div>
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>Confidence — {form.confidencePct}%</Label>
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
        <Label className={labelClasses} style={labelStyle}>Owner</Label>
        <Select value={form.owner} onValueChange={(v) => setField('owner', v as string)}>
          <SelectTrigger className="w-full text-[13px]"><SelectValue placeholder="Select owner..." /></SelectTrigger>
          <SelectContent>
            {OWNERS.map((o) => <SelectItem key={o.name} value={o.name}>{o.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div
        className="rounded-xl p-3 text-[12px]"
        style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}
      >
        Lead opens in stage <span className="font-bold">Lead Generation</span>. Transition forward by drag-drop in the
        Kanban, or mark Lost from the drawer.
      </div>

      <div
        className="rounded-xl border p-3"
        style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
      >
        <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
          Review
        </div>
        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <div><span style={{ color: 'var(--qms-text-muted)' }}>Pharma:</span> {form.pharmaCompanyName || '—'}</div>
          <div><span style={{ color: 'var(--qms-text-muted)' }}>Division:</span> {form.divisionName || '—'}</div>
          <div><span style={{ color: 'var(--qms-text-muted)' }}>Focus therapy:</span> {form.focusTherapies.join(', ') || '—'}</div>
          <div><span style={{ color: 'var(--qms-text-muted)' }}>Brands:</span> {form.brandNames.join(', ') || '—'}</div>
          <div><span style={{ color: 'var(--qms-text-muted)' }}>MRs:</span> {form.mrCount || '—'}</div>
          <div><span style={{ color: 'var(--qms-text-muted)' }}>Project type:</span> {form.projectType || '—'}</div>
          <div><span style={{ color: 'var(--qms-text-muted)' }}>QMS offer:</span> {form.qmsOffers.join(', ') || '—'}</div>
          <div><span style={{ color: 'var(--qms-text-muted)' }}>AI score:</span> <span className="font-bold">{score}</span></div>
          <div><span style={{ color: 'var(--qms-text-muted)' }}>Value:</span> {formatINR(form.estimatedValue)}</div>
        </div>
      </div>
    </div>
  )
}

export default WizardStep4
