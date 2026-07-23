import { FiActivity, FiHeart, FiVideo, FiDroplet, FiShuffle, FiTag, FiInfo } from 'react-icons/fi'
import type { WizardFormState } from '@/features/projects/wizard.types'
import type { ProjectTest, ProjectTherapy, ProjectType } from '@/types/project.types'
import { PROJECT_TEST_LABEL, PROJECT_THERAPY_LABEL, PROJECT_TYPE_LABEL } from '@/types/project.types'
import { PROJECT_TYPE_COLOR } from '@/features/projects/projects.utils'
import { PickCard, PickGrid } from '@/components/ui/PickCard'
import SectionHeader from '@/components/ui/SectionHeader'
import { ChipRow, ChipToggle } from '@/components/ui/ChipToggle'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { labelClasses, labelStyle, fieldClasses } from '@/features/projects/components/wizard/wizard.styles'

const TYPE_ICONS: Record<ProjectType, typeof FiActivity> = {
  screening_camp: FiActivity,
  diet: FiHeart,
  teleconsultation_diet: FiVideo,
  lab_test: FiDroplet,
  mixed: FiShuffle,
}

const THERAPY_OPTIONS = Object.keys(PROJECT_THERAPY_LABEL) as ProjectTherapy[]
const TYPE_OPTIONS = Object.keys(PROJECT_TYPE_LABEL) as ProjectType[]
const TEST_OPTIONS = Object.keys(PROJECT_TEST_LABEL) as ProjectTest[]

interface WizardStep1Props {
  form: WizardFormState
  setField: <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => void
}

// Client/division no longer picked here — they're derived server-side from
// the Step 0-selected lead's own tenant/division (never sent in the create
// payload). `type` is now a real multi-select array (backend model field),
// not a single-select — this also removes the old "Mixed" special case
// entirely: a project can just be `type: ['diet', 'lab_test']` directly.
const WizardStep1 = ({ form, setField }: WizardStep1Props) => {
  const toggleType = (id: ProjectType) => {
    setField('type', form.type.includes(id) ? form.type.filter((t) => t !== id) : [...form.type, id])
  }

  const toggleTest = (id: ProjectTest) => {
    setField('tests', form.tests.includes(id) ? form.tests.filter((t) => t !== id) : [...form.tests, id])
  }

  return (
    <div className="space-y-4">
      {form.leadId && (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
          <FiInfo size={12} />
          Creating for <span style={{ color: 'var(--qms-text)' }}>{form.leadTenantName || '—'}</span>
          {form.leadDivisionName && <> · <span style={{ color: 'var(--qms-text)' }}>{form.leadDivisionName}</span></>}
          {' '}(from lead "{form.leadTitle}")
        </div>
      )}

      <div>
        <Label className={labelClasses} style={labelStyle}>Project name *</Label>
        <Input type="text" value={form.name} onChange={(e) => setField('name', e.target.value)} className={fieldClasses} placeholder="e.g. Sun Cardio · Mumbai Screening · FY26" />
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>Therapy *</Label>
        <Select value={form.therapy} onValueChange={(v) => setField('therapy', v as ProjectTherapy)}>
          <SelectTrigger className={`w-full ${fieldClasses}`}><SelectValue placeholder="— therapy —" /></SelectTrigger>
          <SelectContent>
            {THERAPY_OPTIONS.map((t) => (
              <SelectItem key={t} value={t}>{PROJECT_THERAPY_LABEL[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <SectionHeader icon={FiTag} spaced={false}>Type of project (multi-select) *</SectionHeader>
        <PickGrid>
          {TYPE_OPTIONS.map((pt) => (
            <PickCard
              key={pt}
              active={form.type.includes(pt)}
              color={PROJECT_TYPE_COLOR[pt]}
              label={PROJECT_TYPE_LABEL[pt]}
              icon={TYPE_ICONS[pt]}
              onClick={() => toggleType(pt)}
            />
          ))}
        </PickGrid>
      </div>

      <div>
        <SectionHeader icon={FiDroplet}>Tests to be conducted</SectionHeader>
        <ChipRow>
          {TEST_OPTIONS.map((t) => (
            <ChipToggle key={t} active={form.tests.includes(t)} onClick={() => toggleTest(t)}>
              {PROJECT_TEST_LABEL[t]}
            </ChipToggle>
          ))}
        </ChipRow>
      </div>
    </div>
  )
}

export default WizardStep1
