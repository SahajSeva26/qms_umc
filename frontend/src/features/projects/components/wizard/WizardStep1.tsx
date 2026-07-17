import { FiActivity, FiHeart, FiVideo, FiDroplet, FiShuffle, FiBriefcase, FiTag, FiLayers } from 'react-icons/fi'
import type { WizardFormState } from '@/features/projects/wizard.types'
import type { MixedSubType, ProjectType } from '@/types/project.types'
import { CLIENTS, DIVISIONS } from '@/types/client.types'
import { PROJECT_TYPES, MIXED_SUBTYPES, THERAPIES } from '@/types/project.types'
import { TESTS } from '@/features/projects/projects.tests'
import { PickCard, PickGrid } from '@/components/ui/PickCard'
import SectionHeader from '@/components/ui/SectionHeader'
import { ChipRow, ChipToggle } from '@/components/ui/ChipToggle'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { labelClasses, labelStyle, fieldClasses } from '@/features/projects/components/wizard/wizard.styles'

const TYPE_ICONS: Record<ProjectType, typeof FiActivity> = {
  Screening: FiActivity,
  Diet: FiHeart,
  TeleDiet: FiVideo,
  Lab: FiDroplet,
  Mixed: FiShuffle,
}

const MIXED_ICONS: Record<MixedSubType, typeof FiActivity> = {
  Screening: FiActivity,
  Diet: FiHeart,
  DedicatedFO: FiBriefcase,
  Lab: FiDroplet,
}

interface WizardStep1Props {
  form: WizardFormState
  setField: <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => void
}

const WizardStep1 = ({ form, setField }: WizardStep1Props) => {
  const divisionOptions = DIVISIONS.filter((d) => !form.clientId || d.clientId === form.clientId)

  const toggleMixedSubType = (id: MixedSubType) => {
    setField(
      'mixedSubTypes',
      form.mixedSubTypes.includes(id) ? form.mixedSubTypes.filter((s) => s !== id) : [...form.mixedSubTypes, id]
    )
  }

  const toggleTest = (testId: string) => {
    setField(
      'testsConducted',
      form.testsConducted.includes(testId) ? form.testsConducted.filter((t) => t !== testId) : [...form.testsConducted, testId]
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className={labelClasses} style={labelStyle}>Project name *</Label>
        <Input type="text" value={form.name} onChange={(e) => setField('name', e.target.value)} className={fieldClasses} placeholder="e.g. Sun Cardio · Mumbai Screening · FY26" />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <Label className={labelClasses} style={labelStyle}>Pharma client *</Label>
          <Select value={form.clientId} onValueChange={(v) => { setField('clientId', v as string); setField('divisionId', '') }}>
            <SelectTrigger className={`w-full ${fieldClasses}`}><SelectValue placeholder="— select pharma —" /></SelectTrigger>
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
            <SelectTrigger className={`w-full ${fieldClasses}`}><SelectValue placeholder="— select division —" /></SelectTrigger>
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
          <SelectTrigger className={`w-full ${fieldClasses}`}><SelectValue placeholder="— therapy —" /></SelectTrigger>
          <SelectContent>
            {THERAPIES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <SectionHeader icon={FiTag} spaced={false}>Type of project *</SectionHeader>
        <PickGrid>
          {PROJECT_TYPES.map((pt) => (
            <PickCard
              key={pt.id}
              active={form.type === pt.id}
              color={pt.color}
              label={pt.label}
              icon={TYPE_ICONS[pt.id]}
              onClick={() => { setField('type', pt.id); if (pt.id !== 'Mixed') setField('mixedSubTypes', []) }}
            />
          ))}
        </PickGrid>
      </div>

      {form.type === 'Mixed' && (
        <div>
          <SectionHeader icon={FiLayers}>Mixed project · pick the sub-types in scope *</SectionHeader>
          <div className="grid grid-cols-2 gap-2">
            {MIXED_SUBTYPES.map((st) => {
              const checked = form.mixedSubTypes.includes(st.id)
              const Icon = MIXED_ICONS[st.id]
              return (
                <label
                  key={st.id}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] border cursor-pointer transition-colors"
                  style={{
                    borderColor: checked ? st.color : 'var(--qms-border)',
                    background: checked ? `color-mix(in srgb, ${st.color} 8%, transparent)` : 'var(--qms-surface)',
                  }}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggleMixedSubType(st.id)} className="sr-only" />
                  <span
                    className="inline-flex items-center justify-center w-7 h-7 rounded-lg shrink-0 text-white"
                    style={{ background: st.color }}
                  >
                    <Icon size={14} />
                  </span>
                  <span className="text-[12.5px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{st.label}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <SectionHeader icon={FiDroplet}>Tests to be conducted</SectionHeader>
        {TESTS.length > 0 ? (
          <ChipRow>
            {TESTS.map((t) => (
              <ChipToggle key={t.id} active={form.testsConducted.includes(t.id)} onClick={() => toggleTest(t.id)}>
                {t.code}
              </ChipToggle>
            ))}
          </ChipRow>
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
