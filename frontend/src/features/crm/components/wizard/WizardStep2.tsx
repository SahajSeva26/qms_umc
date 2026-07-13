import type { WizardFormState } from '@/features/crm/wizard.types'
import { CURRENT_ACTIVITIES } from '@/features/crm/crm.mock'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import ChipPicker from '@/features/crm/components/wizard/ChipPicker'

const labelClasses = 'block text-[10px] font-semibold tracking-widest uppercase mb-2'
const labelStyle = { color: 'var(--qms-text-muted)' }

interface WizardStep2Props {
  form: WizardFormState
  setField: <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => void
}

const WizardStep2 = ({ form, setField }: WizardStep2Props) => (
  <div className="space-y-4">
    <div>
      <Label className={labelClasses} style={labelStyle}>Subject / title *</Label>
      <Input
        type="text"
        value={form.subject}
        onChange={(e) => setField('subject', e.target.value)}
        className="text-[13px]"
        placeholder="e.g. Cardiology screening expansion — Mumbai metro"
      />
    </div>

    <div>
      <Label className={labelClasses} style={labelStyle}>Problem statement *</Label>
      <Textarea
        value={form.problemStatement}
        onChange={(e) => setField('problemStatement', e.target.value)}
        rows={4}
        className="text-[13px]"
        placeholder="Describe the client's need in detail..."
      />
    </div>

    <div>
      <Label className={labelClasses} style={labelStyle}>No. of MRs</Label>
      <Input
        type="number"
        value={form.mrCount || ''}
        onChange={(e) => setField('mrCount', Number(e.target.value))}
        className="text-[13px]"
      />
    </div>

    <div>
      <Label className={labelClasses} style={labelStyle}>Currently doing *</Label>
      <ChipPicker options={CURRENT_ACTIVITIES} selected={form.currentActivities} onChange={(v) => setField('currentActivities', v)} placeholder="Add an activity..." />
      {form.currentActivities.includes('Other') && (
        <Input
          type="text"
          value={form.currentActivityOther}
          onChange={(e) => setField('currentActivityOther', e.target.value)}
          className="text-[13px] mt-2"
          placeholder="Specify other activity *"
        />
      )}
    </div>

    <div>
      <Label className={labelClasses} style={labelStyle}>Notes</Label>
      <Textarea
        value={form.currentActivityNotes}
        onChange={(e) => setField('currentActivityNotes', e.target.value)}
        rows={2}
        className="text-[13px]"
      />
    </div>
  </div>
)

export default WizardStep2
