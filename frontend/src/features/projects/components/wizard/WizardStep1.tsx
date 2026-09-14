import { useEffect } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
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
import { useWizardFieldError } from '@/features/projects/components/wizard/WizardValidationContext'

const TYPE_ICONS: Record<ProjectType, typeof FiActivity> = {
  screening_camp: FiActivity,
  diet: FiHeart,
  teleconsultation_diet: FiVideo,
  lab_test: FiDroplet,
  mixed: FiShuffle,
}

const THERAPY_OPTIONS = Object.keys(PROJECT_THERAPY_LABEL) as ProjectTherapy[]
const TYPE_OPTIONS = Object.keys(PROJECT_TYPE_LABEL) as ProjectType[]

// Client/division aren't picked here — derived server-side from the Step
// 0-selected lead. `mixed` can be picked alongside any other type.
const WizardStep1 = () => {
  const { control, setValue } = useFormContext<WizardFormState>()
  const fieldError = useWizardFieldError()
  const leadId = useWatch({ control, name: 'leadId' })
  const leadTenantName = useWatch({ control, name: 'leadTenantName' })
  const leadDivisionName = useWatch({ control, name: 'leadDivisionName' })
  const leadTitle = useWatch({ control, name: 'leadTitle' })
  const name = useWatch({ control, name: 'name' })
  const therapy = useWatch({ control, name: 'therapy' })
  const type = useWatch({ control, name: 'type' })
  const selectedTestIds = useWatch({ control, name: 'tests' })

  const toggleType = (id: ProjectType) => {
    const nextType = type.includes(id) ? type.filter((t) => t !== id) : [...type, id]
    setValue('type', nextType, { shouldValidate: true, shouldDirty: true })
    // Changing project type can shift which tests are shown, so a
    // now-incompatible selected test must not ride along in the payload.
    setValue('tests', [], { shouldDirty: true })
  }

  const toggleTest = (id: string) => {
    setValue('tests', selectedTestIds.includes(id) ? selectedTestIds.filter((t) => t !== id) : [...selectedTestIds, id], { shouldDirty: true })
  }

  // Changing therapy invalidates the shown test list — clear any
  // already-selected tests so a stale id can't ride along in the payload.
  const handleTherapyChange = (v: string | null) => {
    setValue('therapy', (v ?? '') as ProjectTherapy, { shouldValidate: true, shouldDirty: true })
    setValue('tests', [], { shouldDirty: true })
  }

  const allowedCampTypes = allowedCampTypesForProjectTypes(type)

  // test-master:search/manage is a different namespace than project:manage —
  // gate the query so it never fires and 403s for an actor who lacks it.
  const { hasAnyPermission } = usePermission()
  const canBrowseTests = hasAnyPermission(['test-master:search', 'test-master:manage'])

  // Disabled until BOTH a therapy AND a project type are picked — otherwise a
  // selected test could vanish once therapy/type is later chosen.
  const {
    tests,
    isLoading: isLoadingTests,
    isFetching: isFetchingMoreTests,
    error: testsError,
    hasMore: hasMoreTests,
    loadMore: loadMoreTests,
    refetch: refetchTests,
  } = useTestsForProjectWizard(therapy, allowedCampTypes, canBrowseTests)

  // If canBrowseTests turns false mid-flow (e.g. a session refetch), clear
  // any selected tests so a stale id can't ride along in the payload.
  useEffect(() => {
    if (!canBrowseTests && selectedTestIds.length > 0) {
      setValue('tests', [], { shouldDirty: true })
    }
  }, [canBrowseTests, selectedTestIds.length, setValue])

  return (
    <div className="space-y-4">
      {leadId && (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
          <FiInfo size={12} />
          Creating for <span style={{ color: 'var(--qms-text)' }}>{leadTenantName || '—'}</span>
          {leadDivisionName && <> · <span style={{ color: 'var(--qms-text)' }}>{leadDivisionName}</span></>}
          {' '}(from lead "{leadTitle}")
        </div>
      )}

      <div>
        <Label className={labelClasses} style={labelStyle}>Project name *</Label>
        <Input
          type="text"
          value={name}
          onChange={(e) => setValue('name', e.target.value, { shouldValidate: true, shouldDirty: true })}
          className={fieldClasses}
          placeholder="e.g. Sun Cardio · Mumbai Screening · FY26"
        />
        {fieldError('name') && <p className="text-[11px] mt-1 text-danger">{fieldError('name')}</p>}
      </div>

      <div>
        <Label className={labelClasses} style={labelStyle}>Therapy *</Label>
        <Select value={therapy} onValueChange={handleTherapyChange}>
          <SelectTrigger className={`w-full ${fieldClasses}`}><SelectValue placeholder="— therapy —" /></SelectTrigger>
          <SelectContent>
            {THERAPY_OPTIONS.map((t) => (
              <SelectItem key={t} value={t}>{PROJECT_THERAPY_LABEL[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldError('therapy') && <p className="text-[11px] mt-1 text-danger">{fieldError('therapy')}</p>}
      </div>

      <div>
        <SectionHeader icon={FiTag} spaced={false}>Type of project (multi-select) *</SectionHeader>
        <PickGrid>
          {TYPE_OPTIONS.map((pt) => (
            <PickCard
              key={pt}
              active={type.includes(pt)}
              color={PROJECT_TYPE_COLOR[pt]}
              label={PROJECT_TYPE_LABEL[pt]}
              icon={TYPE_ICONS[pt]}
              onClick={() => toggleType(pt)}
            />
          ))}
        </PickGrid>
        {fieldError('type') && <p className="text-[11px] mt-1 text-danger">{fieldError('type')}</p>}
      </div>

      <div>
        <SectionHeader icon={FiDroplet}>Tests to be conducted</SectionHeader>
        {!canBrowseTests ? (
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
            You don't have permission to browse the test catalog. This project will be created with
            no tests selected.
          </p>
        ) : !therapy ? (
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
                <ChipToggle key={t.id} active={selectedTestIds.includes(t.id)} onClick={() => toggleTest(t.id)}>
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
