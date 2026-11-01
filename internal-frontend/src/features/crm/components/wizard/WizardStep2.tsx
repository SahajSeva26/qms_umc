import type { WizardFormState } from '@/features/crm/wizard.types'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { WzChipRow, WzChipToggle } from '@/components/ui/WzChip'
import { labelClasses, labelStyle, fieldClasses } from '@/features/crm/components/wizard/wizard.styles'
import { CURRENT_ACTIVITIES } from '@/features/crm/crm.constants'

interface WizardStep2Props {
  form: WizardFormState
  setField: <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => void
}

const WizardStep2 = ({ form, setField }: WizardStep2Props) => {
  const toggleActivity = (activity: string) => {
    setField('currentlyDoing', form.currentlyDoing.includes(activity) ? form.currentlyDoing.filter((a) => a !== activity) : [...form.currentlyDoing, activity])
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className={labelClasses} style={labelStyle}>Title *</Label>
        <Input
          type="text"
          value={form.title}
          onChange={(e) => setField('title', e.target.value)}
          className={fieldClasses}
          placeholder="e.g. Cardiology screening expansion — Mumbai metro"
        />
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>Problem statement *</Label>
        <Textarea
          value={form.problemStatement}
          onChange={(e) => setField('problemStatement', e.target.value)}
          rows={4}
          className={fieldClasses}
          placeholder="Describe the client's need in detail..."
        />
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>No. of MRs</Label>
        <Input
          type="number"
          value={form.numberOfMRS || ''}
          onChange={(e) => setField('numberOfMRS', Number(e.target.value))}
          className={fieldClasses}
        />
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>Currently doing *</Label>
        <WzChipRow>
          {CURRENT_ACTIVITIES.map((activity) => (
            <WzChipToggle key={activity} active={form.currentlyDoing.includes(activity)} onClick={() => toggleActivity(activity)}>
              {activity}
            </WzChipToggle>
          ))}
        </WzChipRow>
      </div>
    </div>
  )
}

export default WizardStep2
