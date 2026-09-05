import { useEffect } from 'react'
import { FiActivity, FiHeart, FiVideo, FiDroplet, FiShuffle, FiTag, FiInfo } from 'react-icons/fi'
import type { WizardFormState } from '@/features/projects/wizard.types'
import type { ProjectTherapy, ProjectType } from '@/types/project.types'
import { PROJECT_THERAPY_LABEL, PROJECT_TYPE_LABEL } from '@/types/project.types'
import { PROJECT_TYPE_COLOR, allowedCampTypesForProjectTypes } from '@/features/projects/projects.utils'
import { useTestsForProjectWizard } from '@/features/test-master/hooks/useTestsForProjectWizard'
import { usePermission } from '@/hooks/usePermission'
import { PickCard, PickGrid } from '@/components/ui/PickCard'
import SectionHeader from '@/components/ui/SectionHeader'
import { ChipRow, ChipToggle } from '@/components/ui/ChipToggle'
import { Button } from '@/components/ui/button'
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

interface WizardStep1Props {
  form: WizardFormState
  setField: <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => void
}

// Client/division no longer picked here — they're derived server-side from
// the Step 0-selected lead's own tenant/division (never sent in the create
// payload). `type` is now a real multi-select array (backend model field),
// not a single-select — `mixed` is still one of the selectable values
// (ProjectType includes it, PROJECT_TYPE_LABEL/PROJECT_TYPE_COLOR both map
// it), it's simply no longer a mutually-exclusive alternative to the other
// four the way the old mock's single-select modeled it; a project can pick
// `mixed` alongside (or instead of) any other type in the same array, e.g.
// `type: ['diet', 'lab_test']` or `type: ['mixed']`. Because `mixed` stays
// real and selectable, its own camp-type mapping must be explicit rather
// than assumed removed — see PROJECT_TYPE_CAMP_TYPES in projects.utils.ts.
const WizardStep1 = ({ form, setField }: WizardStep1Props) => {
  const toggleType = (id: ProjectType) => {
    const nextType = form.type.includes(id) ? form.type.filter((t) => t !== id) : [...form.type, id]
    setField('type', nextType)
    // The test picker below is scoped to camp types compatible with the
    // selected project type(s) (allowedCampTypesForProjectTypes) — changing
    // that selection can shrink or shift which tests are even shown, so any
    // already-selected test must be cleared here, same reasoning as
    // handleTherapyChange below, or a now-incompatible test id could
    // silently ride along in the submitted payload.
    setField('tests', [])
  }

  const toggleTest = (id: string) => {
    setField('tests', form.tests.includes(id) ? form.tests.filter((t) => t !== id) : [...form.tests, id])
  }

  // Changing therapy invalidates the shown test list — clear any
  // already-selected tests in the same update so a stale id from the
  // previous therapy can never silently ride along in the submitted payload.
  const handleTherapyChange = (v: string | null) => {
    setField('therapy', (v ?? '') as ProjectTherapy)
    setField('tests', [])
  }

  const allowedCampTypes = allowedCampTypesForProjectTypes(form.type)

  // GET /test-masters requires test-master:search/manage — not every actor
  // who can create a project necessarily holds it (only Field Officer and
  // the two Ops Manager role types do by default; a project creator reaches
  // this wizard via project:manage/tenant:manage, an unrelated permission
  // namespace). Gate the query itself so it never fires and 403s for an
  // actor who genuinely lacks it — mirrors EditTestModal.tsx's
  // canViewResults pattern. Currently unreachable in practice (no default
  // role type both creates projects and lacks test-master access — only
  // system:manage, which holds every permission, or a custom role reaches
  // project creation at all today) — if that combination becomes real, the
  // actual fix is a role-policy decision (grant project creators
  // test-master:search by default) or building real post-create
  // test-editing into EditProjectModal.tsx (it has none today — its
  // EditFormState carries no `tests` field even though
  // UpdateProjectPayload.tests exists on the type), not a frontend
  // workaround here.
  const { hasAnyPermission } = usePermission()
  const canBrowseTests = hasAnyPermission(['test-master:search', 'test-master:manage'])

  // Disabled (not merely hidden) until BOTH a therapy AND at least one
  // project type are picked — showing an unfiltered (or type-unscoped) list
  // first would let a test be selected that then vanishes once a therapy or
  // project type is chosen/changed, contradicting the scoped intent.
  const {
    tests,
    isLoading: isLoadingTests,
    isFetching: isFetchingMoreTests,
    error: testsError,
    hasMore: hasMoreTests,
    loadMore: loadMoreTests,
    refetch: refetchTests,
  } = useTestsForProjectWizard(form.therapy, allowedCampTypes, canBrowseTests)

  // If canBrowseTests transitions to false while the wizard is open (e.g. a
  // session refetch revokes the permission mid-flow), clear any
  // already-selected tests — otherwise the "created with no tests selected"
  // message below could become false, with a stale test id still riding
  // along in the submit payload. No discrete user action causes this
  // transition (unlike toggleType/handleTherapyChange below, which fire
  // directly from a click), so an effect is the correct mechanism here.
  useEffect(() => {
    if (!canBrowseTests && form.tests.length > 0) {
      setField('tests', [])
    }
  }, [canBrowseTests, form.tests.length, setField])

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
        <Select value={form.therapy} onValueChange={handleTherapyChange}>
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
        {!canBrowseTests ? (
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
            You don't have permission to browse the test catalog. This project will be created with
            no tests selected.
          </p>
        ) : !form.therapy ? (
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Select a therapy to see available tests.</p>
        ) : allowedCampTypes.length === 0 ? (
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Select a project type to see available tests.</p>
        ) : isLoadingTests ? (
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Loading tests…</p>
        ) : testsError ? (
          <div className="text-[12px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger flex items-center justify-between gap-2">
            <span>Couldn't load tests for this therapy.</span>
            <button
              type="button"
              className="font-semibold underline decoration-dotted underline-offset-2 hover:no-underline shrink-0"
              onClick={() => refetchTests()}
            >
              Retry
            </button>
          </div>
        ) : tests.length === 0 ? (
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No tests configured for this therapy and project type yet.</p>
        ) : (
          <>
            <ChipRow>
              {tests.map((t) => (
                <ChipToggle key={t.id} active={form.tests.includes(t.id)} onClick={() => toggleTest(t.id)}>
                  {t.name}
                </ChipToggle>
              ))}
            </ChipRow>
            {hasMoreTests && (
              <Button type="button" variant="outline" size="xs" className="mt-2" onClick={loadMoreTests} disabled={isFetchingMoreTests}>
                {isFetchingMoreTests ? 'Loading…' : 'Load more tests'}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default WizardStep1
