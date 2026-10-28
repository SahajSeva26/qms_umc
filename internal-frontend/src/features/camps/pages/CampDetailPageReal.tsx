import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { useCreateCamp } from '@/features/camps/hooks/useCreateCamp'
import { useProjectDetailShared } from '@/hooks/useProjectsDataShared'
import { useCampPickerData } from '@/features/camps/hooks/useCampPickerData'
import { useCampDraft } from '@/features/camps/hooks/useCampDraft'
import { useCampDraftStore, type NewCampDraftSnapshot } from '@/features/camps/campDraft.store'
import { useDebouncedDraftSync } from '@/hooks/useDebouncedDraftSync'
import { useDivisionsShared } from '@/hooks/useDivisionsShared'
import { campRefId, saveErrorMessage, withCampParam } from '@/features/camps/campsReal.utils'
import { usePermission } from '@/hooks/usePermission'
import { isForbiddenError } from '@/utils/apiError'
import ProjectPicker from '@/features/camps/components/ProjectPicker'
import CampFormFields from '@/features/camps/components/CampFormFields'
import ProjectDevicesRequiredCard from '@/components/widgets/camp/ProjectDevicesRequiredCard'
import { EditDoctorModal } from '@/features/doctors'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import TenantPicker from '@/components/ui/TenantPicker'
import DraftLoadingPlaceholder from '@/components/ui/DraftLoadingPlaceholder'
import DraftResumeDecision from '@/components/ui/DraftResumeDecision'
import type { CampTimeSlotValue } from '@/types/campTimeSlot.constants'
import type { ProjectEntity } from '@/types/project.types'
import type { LocationValue } from '@/types/location.types'
import type { LocationResolutionState } from '@/components/widgets/location-picker/location.types'
import { CAMP_TYPE_VALUES, type CampType } from '@/types/campReal.types'
import { allowedCampTypesForProjectTypes } from '@/types/project.types'

// Matches useDoctorCreateScope's own CLIENT_SIDE_FETCH_LIMIT convention.
const CLIENT_SIDE_FETCH_LIMIT = 200

// camp:create is a distinct backend permission from update; this page only handles creation.
const CAMP_CREATE_PERMISSIONS = ['camp:create', 'camp:manage', 'tenant:manage']

const CampDetailPageReal = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { hasAnyPermission, hasPermission } = usePermission()
  const canWrite = hasAnyPermission(CAMP_CREATE_PERMISSIONS)
  const canManageDoctors = hasPermission('doctor:manage')

  const rawType = searchParams.get('type')
  const isValidCampType = (v: string): v is CampType => (CAMP_TYPE_VALUES as readonly string[]).includes(v)
  const lockedTypeValue = rawType && isValidCampType(rawType) ? rawType : null
  const returnTo = searchParams.get('from') || '/camps'

  const { draft, setField: setFieldRaw } = useCampDraft(null, lockedTypeValue ?? undefined)
  const { tenant, division, project, doctor, mr, date, timeSlot, location, devices, notes, type, billingType, patientExpectation, fo, dietitian } = draft

  // Pin can visibly move before (or without ever) firing onChange — Save must block until it settles.
  const [locationResolution, setLocationResolution] = useState<LocationResolutionState>('idle')

  const [mrLabel, setMrLabel] = useState('')
  const [foLabel, setFoLabel] = useState('')
  const [dietitianLabel, setDietitianLabel] = useState('')
  const [projectLabel, setProjectLabelState] = useState('')
  const [doctorLabelState, setDoctorLabelState] = useState('')
  const [deviceLabels, setDeviceLabels] = useState<Record<string, string>>({})
  const [pickedProject, setPickedProject] = useState<ProjectEntity | null>(null)
  const [showNewDoctor, setShowNewDoctor] = useState(false)
  const [projectMismatchError, setProjectMismatchError] = useState<string | null>(null)

  // This page only ever creates a camp (never edits), so draft persistence is always on.
  const { status: draftStatus, store: draftStore } = useCampDraftStore()
  const [draftMode, setDraftMode] = useState<'loading' | 'pending-decision' | 'active'>('loading')
  // No RHF isDirty here — tracks "a real edit happened" manually.
  const [hasEdited, setHasEdited] = useState(false)

  if (draftMode === 'loading' && draftStatus === 'ready') {
    setDraftMode(draftStore.getState().draft ? 'pending-decision' : 'active')
  }

  const snapshot: NewCampDraftSnapshot = useMemo(
    () => ({ draft, projectLabel, doctorLabel: doctorLabelState, mrLabel, foLabel, dietitianLabel, deviceLabels }),
    [draft, projectLabel, doctorLabelState, mrLabel, foLabel, dietitianLabel, deviceLabels],
  )
  const stopSync = useDebouncedDraftSync(
    snapshot,
    draftMode === 'active' && hasEdited,
    (v) => draftStore?.getState().setDraft(v),
  )

  // useCampDraft is a reducer, not one setState — restore each field individually.
  const handleResumeDraft = () => {
    const snap = draftStore?.getState().draft
    if (snap) {
      for (const key of Object.keys(snap.draft) as (keyof typeof snap.draft)[]) {
        // A route-scoped type (e.g. /camps/new?type=diet) always wins — a draft saved under a
        // different type must not silently flip the camp type the selector itself keeps locked.
        if (key === 'type' && lockedTypeValue) continue
        setField(key, snap.draft[key])
      }
      setProjectLabelState(snap.projectLabel)
      setDoctorLabelState(snap.doctorLabel)
      setMrLabel(snap.mrLabel)
      setFoLabel(snap.foLabel)
      setDietitianLabel(snap.dietitianLabel)
      setDeviceLabels(snap.deviceLabels)
      setHasEdited(true)
    }
    setDraftMode('active')
  }

  const handleDiscardDraft = () => {
    draftStore?.getState().clearDraft()
    setDraftMode('active')
  }

  const setField: typeof setFieldRaw = (key, value) => {
    if (!hasEdited) setHasEdited(true)
    setFieldRaw(key, value)
  }

  const effectiveTenant = tenant

  const { tenants } = useCampPickerData(true)

  const {
    data: divisionsData,
    isLoading: divisionsLoading,
    isError: divisionsErrored,
    error: divisionsError,
    refetch: refetchDivisions,
  } = useDivisionsShared({ tenant: effectiveTenant || undefined, limit: String(CLIENT_SIDE_FETCH_LIMIT) }, !!effectiveTenant)
  const divisions = divisionsData?.data?.items ?? []
  // A 403 means the actor lacks division:manage/tenant:admin/lead:manage — retrying never helps.
  const divisionsForbidden = isForbiddenError(divisionsError)
  const bookableSlots = pickedProject?.campTimeSlots ?? []
  // Backend hard-400s create() when camp.type isn't in project.type[] (camp.service.ts) — narrow here to match.
  const allowedCampTypes = pickedProject ? allowedCampTypesForProjectTypes(pickedProject.type) : CAMP_TYPE_VALUES

  // Covers the resume-draft gap: only the project id/label were persisted, not the full
  // ProjectEntity (it isn't stored at all) — re-fetch it once `project` is known but unpicked.
  // Set during render, not an effect — matches this file's draftMode derivation above.
  const resumingProjectId = !pickedProject ? project || undefined : undefined
  const { data: resumedProjectData, isLoading: resumedProjectLoading, isError: resumedProjectErrored } = useProjectDetailShared(resumingProjectId)
  if (resumedProjectData?.data && !pickedProject) {
    const resumed = resumedProjectData.data
    // A route-locked type must also be one the resumed project actually offers — otherwise the
    // type-lock fix above forces e.g. 'diet' while this project only allows 'screening', and
    // handleSave would silently submit a project/type combination the backend 400s on.
    if (lockedTypeValue && !allowedCampTypesForProjectTypes(resumed.type).includes(lockedTypeValue)) {
      setField('project', '')
      setProjectLabelState('')
      setProjectMismatchError("This draft's project doesn't support this camp type — pick a project again.")
    } else {
      setPickedProject(resumed)
    }
  } else if (resumingProjectId && resumedProjectErrored && !pickedProject) {
    setField('project', '')
    setProjectLabelState('')
    setProjectMismatchError("Couldn't load this draft's project — it may have been removed or you may no longer have access. Pick a project again.")
  }

  const handleProjectChange = (p: ProjectEntity) => {
    // Defensive: ProjectPicker already filters by division, but reject rather than silently overwrite it.
    if (campRefId(p.division) !== division) {
      setProjectMismatchError("This project doesn't belong to the selected division.")
      return
    }
    setProjectMismatchError(null)
    setField('project', p.id)
    setProjectLabelState(p.name)
    setPickedProject(p)
    if (timeSlot && !p.campTimeSlots.includes(timeSlot)) setField('timeSlot', '')
    const nextAllowedTypes = allowedCampTypesForProjectTypes(p.type)
    if (!nextAllowedTypes.includes(type) && nextAllowedTypes[0]) setField('type', nextAllowedTypes[0])
  }

  const createCamp = useCreateCamp()
  const [formError, setFormError] = useState<string | null>(null)

  const handleSave = () => {
    if (locationResolution === 'loading') { setFormError('Still resolving the picked location — wait a moment and try again'); return }
    if (locationResolution === 'error') { setFormError('Retry or choose "Use this pin" for the location before saving'); return }
    if (resumedProjectLoading) { setFormError("Still loading the resumed draft's project — wait a moment and try again"); return }

    if (!tenant) { setFormError('Company is required'); return }
    if (!project) { setFormError('Project is required'); return }
    if (!division) { setFormError('Division is required'); return }
    if (!doctor) { setFormError('Doctor is required'); return }
    if (!mr) { setFormError('MR is required'); return }
    if (!date) { setFormError('Date is required'); return }
    if (!timeSlot) { setFormError('Time slot is required'); return }
    if (!location) { setFormError('Location is required'); return }
    if (!location.addressLine1.trim() || !location.city.trim() || !location.state.trim() || !location.pincode.trim()) {
      setFormError('Complete the address (street, city, state, pincode)'); return
    }
    if (!location.coordinates) { setFormError('Pick a location on the map'); return }

    setFormError(null)
    const deviceIds = devices ? devices.split(',').map((d) => d.trim()).filter(Boolean) : []
    const patientExpectationNum = patientExpectation ? Number(patientExpectation) : undefined
    createCamp.mutate(
      {
        tenant,
        division,
        project: project || undefined,
        doctor,
        type,
        billingType,
        patientExpectation: patientExpectationNum,
        // Backend 400s if both fo and dietitian are present — only send the one matching type.
        ...(type === 'diet' ? { dietitian: dietitian || undefined } : { fo: fo || undefined }),
        mr,
        date,
        timeSlot: timeSlot as CampTimeSlotValue,
        location: location as LocationValue,
        devices: deviceIds,
        notes: notes || undefined,
      },
      {
        onSuccess: (res) => {
          // Stop before clearing — otherwise the sync's flush-on-unmount could
          // re-write the draft right after it's cleared.
          stopSync()
          draftStore?.getState().clearDraft()
          if (res.data?.id) navigate(withCampParam(returnTo, res.data.id))
        },
      },
    )
  }

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate(returnTo)}
        className="flex items-center gap-1.5 text-[13px] font-semibold mb-5 transition-colors hover:opacity-80"
        style={{ color: 'var(--qms-text-soft)' }}
      >
        <FiArrowLeft size={14} />
        Back to camps
      </button>

      <div
        className="rounded-xl border p-5 mb-5"
        style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
      >
        <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--qms-text)' }}>New camp</h2>

        {draftMode === 'loading' && <DraftLoadingPlaceholder />}
        {draftMode === 'pending-decision' && (
          <DraftResumeDecision itemLabel="camp" onResume={handleResumeDraft} onDiscard={handleDiscardDraft} />
        )}

        {draftMode === 'active' && (
        <>
        <div className="space-y-4">
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Company *</Label>
            <TenantPicker
              tenants={tenants}
              value={tenant}
              onValueChange={(v) => {
                setField('tenant', v)
                setField('division', '')
                setField('project', '')
                setProjectLabelState('')
                setPickedProject(null)
                setProjectMismatchError(null)
                setField('doctor', '')
                setDoctorLabelState('')
                setField('timeSlot', '')
                // FO is global platform staff (not company-scoped) but is cleared too, conservatively.
                setField('mr', '')
                setMrLabel('')
                setField('fo', '')
                setFoLabel('')
                setField('dietitian', '')
                setDietitianLabel('')
              }}
            />
          </div>
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Division *</Label>
            <Select
              key={division || 'empty'}
              value={division || undefined}
              onValueChange={(v) => {
                setField('division', v ?? '')
                setField('project', '')
                setProjectLabelState('')
                setPickedProject(null)
                setProjectMismatchError(null)
                setField('doctor', '')
                setDoctorLabelState('')
                setField('timeSlot', '')
              }}
              disabled={!effectiveTenant || divisionsErrored}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={!effectiveTenant ? 'Select a company first' : divisionsLoading ? 'Loading…' : 'Select division…'}>
                  {(v: string) => divisions.find((d) => d.id === v)?.name ?? (divisionsLoading ? 'Loading…' : 'Select division…')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {divisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {effectiveTenant && divisionsErrored && (
              <div className="flex items-center gap-2 mt-1.5">
                {divisionsForbidden ? (
                  <p className="text-[11px] text-danger">Your role doesn't have access to Divisions — contact an admin to update your permissions.</p>
                ) : (
                  <>
                    <p className="text-[11px] text-danger">Couldn't load this company's divisions.</p>
                    <button type="button" onClick={() => refetchDivisions()} className="text-[11px] font-semibold underline decoration-dotted underline-offset-2 hover:no-underline">
                      Retry
                    </button>
                  </>
                )}
              </div>
            )}
            {effectiveTenant && !divisionsLoading && !divisionsErrored && divisions.length === 0 && (
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>This company has no divisions yet.</p>
            )}
          </div>
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Project *</Label>
            <ProjectPicker
              value={project}
              label={projectLabel}
              tenant={tenant || undefined}
              division={division || undefined}
              onChange={handleProjectChange}
              onClear={() => {
                setField('project', '')
                setProjectLabelState('')
                setPickedProject(null)
                setProjectMismatchError(null)
                setField('timeSlot', '')
              }}
            />
            {resumedProjectLoading && !projectMismatchError && (
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>Loading the resumed draft's project…</p>
            )}
            {projectMismatchError && (
              <p className="text-[11px] text-danger mt-1.5">{projectMismatchError}</p>
            )}
          </div>

          {pickedProject && <ProjectDevicesRequiredCard testIds={pickedProject.tests} campType={type} />}

          {showNewDoctor && (
            <EditDoctorModal
              open
              doctor={null}
              forcedTenant={{ id: effectiveTenant, label: tenants.find((t) => t.id === effectiveTenant)?.name ?? effectiveTenant }}
              forcedDivision={division ? { id: division, label: divisions.find((d) => d.id === division)?.name ?? division, note: 'locked to the selected division' } : undefined}
              onCreated={(created) => {
                setField('doctor', created.id)
                setDoctorLabelState(created.name)
              }}
              onClose={() => setShowNewDoctor(false)}
            />
          )}

          <CampFormFields
            mode="create"
            draft={draft}
            setField={setField}
            effectiveTenant={effectiveTenant}
            isLocked={false}
            lockedType={!!lockedTypeValue}
            allowedTypes={allowedCampTypes}
            doctorLabel={doctorLabelState}
            setDoctorLabel={setDoctorLabelState}
            showNewDoctorButton={canManageDoctors}
            newDoctorDisabled={!division}
            onNewDoctor={() => setShowNewDoctor(true)}
            bookableSlots={bookableSlots}
            timeSlotDisabledPlaceholder="Select a project first"
            mrLabel={mrLabel}
            setMrLabel={setMrLabel}
            foLabel={foLabel}
            setFoLabel={setFoLabel}
            dietitianLabel={dietitianLabel}
            setDietitianLabel={setDietitianLabel}
            onTypeChange={(nextType) => {
              // Clear the worker field that no longer applies, so a stale id isn't sent alongside the new type.
              if (nextType === 'diet') { setField('fo', ''); setFoLabel('') }
              else { setField('dietitian', ''); setDietitianLabel('') }
            }}
            deviceLabels={deviceLabels}
            onDevicesChange={(ids, labels) => { setField('devices', ids.join(', ')); setDeviceLabels(labels) }}
            onLocationResolutionChange={setLocationResolution}
          />
        </div>

        {createCamp.isError && (
          <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-4">
            {saveErrorMessage(createCamp.error)}
          </div>
        )}
        {formError && (
          <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-4">{formError}</div>
        )}

        {canWrite ? (
          <Button onClick={handleSave} disabled={createCamp.isPending || locationResolution === 'loading' || resumedProjectLoading} className="mt-4">
            {createCamp.isPending ? 'Saving…' : locationResolution === 'loading' ? 'Resolving location…' : resumedProjectLoading ? 'Loading project…' : 'Create camp'}
          </Button>
        ) : (
          <p className="text-[12px] mt-4" style={{ color: 'var(--qms-text-muted)' }}>
            You don't have permission to create a camp.
          </p>
        )}
        </>
        )}
      </div>
    </div>
  )
}

export default CampDetailPageReal
