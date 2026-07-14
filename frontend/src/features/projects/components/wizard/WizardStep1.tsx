import { FiActivity, FiHeart, FiVideo, FiDroplet, FiShuffle } from 'react-icons/fi'
import type { WizardFormState } from '@/features/projects/wizard.types'
import type { ProjectType } from '@/types/project.types'
import { CLIENTS, DIVISIONS } from '@/types/client.types'
import { PROJECT_TYPES, MIXED_SUBTYPES, THERAPIES } from '@/types/project.types'
import { TESTS } from '@/features/projects/projects.tests'
import ChipPicker from '@/components/ui/ChipPicker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

const labelClasses = 'block text-[10px] font-semibold tracking-widest uppercase mb-2'
const labelStyle = { color: 'var(--qms-text-muted)' }

const TYPE_ICONS: Record<ProjectType, typeof FiActivity> = {
  Screening: FiActivity,
  Diet: FiHeart,
  TeleDiet: FiVideo,
  Lab: FiDroplet,
  Mixed: FiShuffle,
}

interface WizardStep1Props {
  form: WizardFormState
  setField: <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => void
}

const WizardStep1 = ({ form, setField }: WizardStep1Props) => {
  const divisionOptions = DIVISIONS.filter((d) => !form.clientId || d.clientId === form.clientId)

  const toggleMixedSubType = (id: WizardFormState['mixedSubTypes'][number]) => {
    setField(
      'mixedSubTypes',
      form.mixedSubTypes.includes(id) ? form.mixedSubTypes.filter((s) => s !== id) : [...form.mixedSubTypes, id]
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className={labelClasses} style={labelStyle}>Project name *</Label>
        <Input type="text" value={form.name} onChange={(e) => setField('name', e.target.value)} className="text-[13px]" placeholder="e.g. Sun Cardio · Mumbai Screening · FY26" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className={labelClasses} style={labelStyle}>Pharma client *</Label>
          <Select value={form.clientId} onValueChange={(v) => { setField('clientId', v as string); setField('divisionId', '') }}>
            <SelectTrigger className="w-full text-[13px]"><SelectValue placeholder="— select pharma —" /></SelectTrigger>
            <SelectContent>
              {CLIENTS.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={labelClasses} style={labelStyle}>Division</Label>
          <Select value={form.divisionId} onValueChange={(v) => setField('divisionId', v as string)}>
            <SelectTrigger className="w-full text-[13px]"><SelectValue placeholder="— select division —" /></SelectTrigger>
            <SelectContent>
              {divisionOptions.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>Therapy</Label>
        <Select value={form.therapy} onValueChange={(v) => setField('therapy', v as string)}>
          <SelectTrigger className="w-full text-[13px]"><SelectValue placeholder="— therapy —" /></SelectTrigger>
          <SelectContent>
            {THERAPIES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>Type of project *</Label>
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          {PROJECT_TYPES.map((pt) => {
            const Icon = TYPE_ICONS[pt.id]
            const active = form.type === pt.id
            return (
              <button
                key={pt.id}
                onClick={() => { setField('type', pt.id); if (pt.id !== 'Mixed') setField('mixedSubTypes', []) }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all text-left"
                style={active ? { background: `${pt.color}18`, borderColor: pt.color, color: pt.color } : { background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}
              >
                <Icon size={15} />
                <span className="text-[12px] font-semibold">{pt.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {form.type === 'Mixed' && (
        <div>
          <Label className={labelClasses} style={labelStyle}>Mixed sub-types</Label>
          <div className="flex flex-wrap gap-1.5">
            {MIXED_SUBTYPES.map((st) => (
              <button
                key={st.id}
                onClick={() => toggleMixedSubType(st.id)}
                className="text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-all"
                style={
                  form.mixedSubTypes.includes(st.id)
                    ? { background: 'var(--qms-teal)', borderColor: 'var(--qms-teal)', color: '#fff' }
                    : { background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }
                }
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label className={labelClasses} style={labelStyle}>Tests to be conducted</Label>
        {TESTS.length > 0 ? (
          <ChipPicker
            options={TESTS.map((t) => t.code)}
            selected={form.testsConducted.map((id) => TESTS.find((t) => t.id === id)?.code ?? id)}
            onChange={(codes) => setField('testsConducted', codes.map((code) => TESTS.find((t) => t.code === code)?.id ?? code))}
            placeholder="Add a test..."
          />
        ) : (
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
            No tests in master · add in Admin → Master → Tests first.
          </p>
        )}
      </div>
    </div>
  )
}

export default WizardStep1
