import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { useCreateCamp } from '@/features/camps/hooks/useCreateCamp'
import { useCampPickerData } from '@/features/camps/hooks/useCampPickerData'
import { useCampDraft } from '@/features/camps/hooks/useCampDraft'
import { useDivisionsShared } from '@/hooks/useDivisionsShared'
import { campRefId, saveErrorMessage, withCampParam } from '@/features/camps/campsReal.utils'
import { usePermission } from '@/hooks/usePermission'
import { isForbiddenError } from '@/utils/apiError'
import ProjectPicker from '@/features/camps/components/ProjectPicker'
import CampFormFields from '@/features/camps/components/CampFormFields'
import EditDoctorModal from '@/features/doctors/components/EditDoctorModal'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import TenantPicker from '@/components/ui/TenantPicker'
import type { CampTimeSlotValue } from '@/types/campTimeSlot.constants'
import type { ProjectEntity } from '@/types/project.types'
import type { LocationValue } from '@/types/location.types'
import type { LocationResolutionState } from '@/components/widgets/location-picker/location.types'
import { CAMP_TYPE_VALUES, type CampType } from '@/types/campReal.types'

// Matches useDoctorCreateScope's own CLIENT_SIDE_FETCH_LIMIT convention.
const CLIENT_SIDE_FETCH_LIMIT = 200

// create (camp:create) is a distinct backend permission from update — this
// page only ever handles creation, so only the create code is checked here.
const CAMP_CREATE_PERMISSIONS = ['camp:create', 'camp:manage', 'tenant:manage']

const CampDetailPageReal = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { hasAnyPermission, hasPermission } = usePermission()
  const canWrite = hasAnyPermission(CAMP_CREATE_PERMISSIONS)
  const canManageDoctors = hasPermission('doctor:manage')

  // From a type-scoped page's "New camp" button — autofills+locks Type, routes back on cancel/success.
  const rawType = searchParams.get('type')
  const isValidCampType = (v: string): v is CampType => (CAMP_TYPE_VALUES as readonly string[]).includes(v)
  const lockedTypeValue = rawType && isValidCampType(rawType) ? rawType : null
  const returnTo = searchParams.get('from') || '/camps'

  const { draft, setField } = useCampDraft(null, lockedTypeValue ?? undefined)
  const { tenant, division, project, doctor, mr, date, timeSlot, location, devices, notes, type, billingType, patientExpectation, fo } = draft

  // A caller-facing pin can visibly move well before (or without ever) firing
  // onChange — Save must block until the picker settles, same as GeoProfileDetailPage.
  const [locationResolution, setLocationResolution] = useState<LocationResolutionState>('idle')

  const [mrLabel, setMrLabel] = useState('')
  const [foLabel, setFoLabel] = useState('')
  const [projectLabel, setProjectLabelState] = useState('')
  const [doctorLabelState, setDoctorLabelState] = useState('')
  const [deviceLabels, setDeviceLabels] = useState<Record<string, string>>({})
  const [pickedProject, setPickedProject] = useState<ProjectEntity | null>(null)
  const [showNewDoctor, setShowNewDoctor] = useState(false)
  const [projectMismatchError, setProjectMismatchError] = useState<string | null>(null)

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

  const handleProjectChange = (p: ProjectEntity) => {
    // A picked project must belong to the already-chosen Division — reject rather than
    // silently overwrite division out from under the user (defensive; ProjectPicker already filters).
    if (campRefId(p.division) !== division) {
      setProjectMismatchError("This project doesn't belong to the selected division.")
      return
    }
    setProjectMismatchError(null)
    setField('project', p.id)
    setProjectLabelState(p.name)
    setPickedProject(p)
    // The previously-selected slot may not be valid for the new project.
    if (timeSlot && !p.campTimeSlots.includes(timeSlot)) setField('timeSlot', '')
  }

  const createCamp = useCreateCamp()
  const [formError, setFormError] = useState<string | null>(null)

  const handleSave = () => {
    if (locationResolution === 'loading') { setFormError('Still resolving the picked location — wait a moment and try again'); return }
    if (locationResolution === 'error') { setFormError('Retry or choose "Use this pin" for the location before saving'); return }

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
        fo: fo || undefined,
        mr,
        date,
        timeSlot: timeSlot as CampTimeSlotValue,
        location: location as LocationValue,
        devices: deviceIds,
        notes: notes || undefined,
      },
      {
        onSuccess: (res) => {
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
                // A doctor (fetched or just-created) scoped to the old company is no longer valid.
                setField('doctor', '')
                setDoctorLabelState('')
                setField('timeSlot', '')
                // MR is scoped to the old company, no longer valid. FO is global platform staff
                // (not company-scoped) but is cleared too, conservatively, on a company change.
                setField('mr', '')
                setMrLabel('')
                setField('fo', '')
                setFoLabel('')
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
                // Division was picked independently, before Project — retain it on a Project clear.
                setField('timeSlot', '')
              }}
            />
            {projectMismatchError && (
              <p className="text-[11px] text-danger mt-1.5">{projectMismatchError}</p>
            )}
          </div>

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
            doctorLabel={doctorLabelState}
            setDoctorLabel={setDoctorLabelState}
            showNewDoctorButton={canManageDoctors}
            // A new doctor must be scoped to the camp's own division — see forcedDivision above.
            newDoctorDisabled={!division}
            onNewDoctor={() => setShowNewDoctor(true)}
            bookableSlots={bookableSlots}
            timeSlotDisabledPlaceholder="Select a project first"
            mrLabel={mrLabel}
            setMrLabel={setMrLabel}
            foLabel={foLabel}
            setFoLabel={setFoLabel}
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
          <Button onClick={handleSave} disabled={createCamp.isPending || locationResolution === 'loading'} className="mt-4">
            {createCamp.isPending ? 'Saving…' : locationResolution === 'loading' ? 'Resolving location…' : 'Create camp'}
          </Button>
        ) : (
          <p className="text-[12px] mt-4" style={{ color: 'var(--qms-text-muted)' }}>
            You don't have permission to create a camp.
          </p>
        )}
      </div>
    </div>
  )
}

export default CampDetailPageReal
