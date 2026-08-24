import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { useCampReal } from '@/features/camps/hooks/useCampReal'
import { useCreateCamp } from '@/features/camps/hooks/useCreateCamp'
import { useUpdateCamp } from '@/features/camps/hooks/useUpdateCamp'
import { useCampRefNames } from '@/features/camps/hooks/useCampRefNames'
import { useCampPickerData } from '@/features/camps/hooks/useCampPickerData'
import { useCampCandidateRoles } from '@/features/camps/hooks/useCampCandidateRoles'
import { useCampDraft } from '@/features/camps/hooks/useCampDraft'
import { useProject } from '@/features/projects/hooks/useProject'
import { campRefId, campRefName, saveErrorMessage } from '@/features/camps/campsReal.utils'
import { usePermission } from '@/hooks/usePermission'
import CampSummaryHeader from '@/features/camps/components/CampSummaryHeader'
import CampStageMovePanel from '@/features/camps/components/CampStageMovePanel'
import CampStageHistoryList from '@/features/camps/components/CampStageHistoryList'
import ProjectPicker from '@/features/camps/components/ProjectPicker'
import CampMrPicker from '@/features/camps/components/CampMrPicker'
import InventoryMasterMultiPicker from '@/features/inventory/real/components/InventoryMasterMultiPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import TenantPicker from '@/components/ui/TenantPicker'
import type { BillingType, CampEntity, CampType } from '@/types/campReal.types'
import { CAMP_TIME_SLOT_LABEL } from '@/types/campTimeSlot.constants'
import type { CampTimeSlotValue } from '@/types/campTimeSlot.constants'
import type { ProjectEntity } from '@/types/project.types'

const TYPE_OPTIONS: { value: CampType; label: string }[] = [
  { value: 'screening', label: 'Screening' },
  { value: 'diet', label: 'Diet' },
  { value: 'lab', label: 'Lab' },
]

const BILLING_OPTIONS: { value: BillingType; label: string }[] = [
  { value: 'billable', label: 'Billable' },
  { value: 'void', label: 'Void' },
]

// create (camp:create) and update (camp:update) are two distinct backend
// permission codes, not one shared "write" — a create-only actor can't edit.
// Move-stage requires camp:manage/tenant:manage only; camp:update alone can't change status.
const CAMP_CREATE_PERMISSIONS = ['camp:create', 'camp:manage', 'tenant:manage']
const CAMP_UPDATE_PERMISSIONS = ['camp:update', 'camp:manage', 'tenant:manage']
const CAMP_STAGE_PERMISSIONS = ['camp:manage', 'tenant:manage']

const CampDetailPageReal = () => {
  const { id } = useParams<{ id: string }>()
  const isCreateMode = !id
  const navigate = useNavigate()
  const { hasAnyPermission } = usePermission()
  const canCreate = hasAnyPermission(CAMP_CREATE_PERMISSIONS)
  const canUpdate = hasAnyPermission(CAMP_UPDATE_PERMISSIONS)
  const canWrite = isCreateMode ? canCreate : canUpdate
  const canMoveStage = hasAnyPermission(CAMP_STAGE_PERMISSIONS)

  const { data, isLoading, error } = useCampReal(id)
  const camp = data?.data ?? null

  const { doctorName, divisionName, projectName } = useCampRefNames({
    doctors: !isCreateMode,
    divisions: !isCreateMode,
    projects: !isCreateMode,
  })

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate('/camps')}
        className="flex items-center gap-1.5 text-[13px] font-semibold mb-5 transition-colors hover:opacity-80"
        style={{ color: 'var(--qms-text-soft)' }}
      >
        <FiArrowLeft size={14} />
        Back to camps
      </button>

      {!isCreateMode && isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading camp…
        </div>
      )}

      {!isCreateMode && error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load camp. Please try again.
        </div>
      )}

      {(isCreateMode || (camp && !isLoading)) && (
        <>
          <CampSummaryHeader
            camp={camp}
            isCreateMode={isCreateMode}
            doctorName={doctorName}
            divisionName={divisionName}
            projectName={projectName}
          />

          {!isCreateMode && camp && (
            <CampStageMovePanel camp={camp} canWrite={canWrite} canMoveStage={canMoveStage} />
          )}

          {!isCreateMode && camp && <CampStageHistoryList camp={camp} />}

          {/* key={camp?.id ?? 'create'} forces a fresh draft per record so a background
              refetch (e.g. from Move Stage above) never clobbers an in-progress edit. */}
          <CampForm key={camp?.id ?? 'create'} camp={camp} isCreateMode={isCreateMode} canWrite={canWrite} />
        </>
      )}
    </div>
  )
}

interface CampFormProps {
  camp: CampEntity | null
  isCreateMode: boolean
  canWrite: boolean
}

const CampForm = ({ camp, isCreateMode, canWrite }: CampFormProps) => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const { draft, setField } = useCampDraft(camp)
  const { tenant, division, project, doctor, type, billingType, patientExpectation, fo, mr, date, timeSlot, city, state, latitude, longitude, devices, notes } = draft

  // mr/project/devices' human labels aren't part of the string-only CampDraft
  // reducer — tracked locally. Lazy initializers, not an effect: CampForm remounts per record.
  const [mrLabel, setMrLabel] = useState(() => campRefName(camp?.mr) ?? '')
  const [projectLabel, setProjectLabelState] = useState(() =>
    !isCreateMode && camp?.project && typeof camp.project !== 'string' ? camp.project.name : '',
  )
  const [deviceLabels, setDeviceLabels] = useState<Record<string, string>>(() =>
    Object.fromEntries((camp?.devices ?? []).map((d) => [d._id, `${d.name} (${d.code})`])),
  )

  const setTenant = (v: string) => setField('tenant', v)
  const setDivision = (v: string) => setField('division', v)
  const setDoctor = (v: string) => setField('doctor', v)
  const setType = (v: CampType) => setField('type', v)
  const setBillingType = (v: BillingType) => setField('billingType', v)
  const setPatientExpectation = (v: string) => setField('patientExpectation', v)
  const setFo = (v: string) => setField('fo', v)
  const setMr = (v: string) => setField('mr', v)
  const setDate = (v: string) => setField('date', v)
  const setTimeSlot = (v: CampTimeSlotValue | '') => setField('timeSlot', v)
  const setCity = (v: string) => setField('city', v)
  const setState = (v: string) => setField('state', v)
  const setLatitude = (v: string) => setField('latitude', v)
  const setLongitude = (v: string) => setField('longitude', v)
  const setNotes = (v: string) => setField('notes', v)
  const deviceIds = devices ? devices.split(',').map((d) => d.trim()).filter(Boolean) : []
  const setDeviceIds = (ids: string[], labels: Record<string, string>) => {
    setField('devices', ids.join(', '))
    setDeviceLabels(labels)
  }

  const { tenants, doctors } = useCampPickerData(isCreateMode)

  // The backend rejects the ENTIRE update once a camp leaves `requested`
  // (409, camp.service.ts's update()) — not just fo/date, so every field is locked.
  const isLocked = !isCreateMode && !!camp && camp.status !== 'requested'

  // Scopes FO/MR candidates: create mode's picked Company, or edit mode's loaded camp.tenant.
  const effectiveTenant = tenant || campRefId(camp?.tenant) || ''

  const { foRoles, roleLabel } = useCampCandidateRoles(camp)

  const doctorLabel = (id: string) => doctors.find((d) => d.id === id)?.name ?? id

  // A camp's own `project` populate is slim ({_id,name,status}, no division/campTimeSlots) —
  // edit mode fetches the full project separately so the time-slot Select and Division can be scoped.
  const { data: editProjectData } = useProject(!isCreateMode && project ? project : undefined)
  const editProject = editProjectData?.data ?? null

  const [pickedProject, setPickedProject] = useState<ProjectEntity | null>(null)
  const activeProject = isCreateMode ? pickedProject : editProject
  const bookableSlots = activeProject?.campTimeSlots ?? []
  const lockedDivisionName = activeProject ? campRefName(activeProject.division) : null

  const handleProjectChange = (p: ProjectEntity) => {
    setField('project', p.id)
    setProjectLabelState(p.name)
    setPickedProject(p)
    // Division is derived/locked from the project — clear any independently-picked value.
    setField('division', campRefId(p.division) ?? '')
    // The previously-selected slot may not be valid for the new project.
    if (timeSlot && !p.campTimeSlots.includes(timeSlot)) setField('timeSlot', '')
  }

  const createCamp = useCreateCamp()
  const updateCamp = useUpdateCamp(id ?? '')

  const [formError, setFormErrorState] = useState<string | null>(null)

  const handleSave = () => {
    const lat = Number(latitude)
    const lng = Number(longitude)
    const patientExpectationNum = patientExpectation ? Number(patientExpectation) : undefined

    if (isCreateMode) {
      if (!tenant) { setFormErrorState('Company is required'); return }
      if (!project) { setFormErrorState('Project is required'); return }
      if (!division) { setFormErrorState('Division is required'); return }
      if (!doctor) { setFormErrorState('Doctor is required'); return }
      if (!mr) { setFormErrorState('MR is required'); return }
      if (!date) { setFormErrorState('Date is required'); return }
      if (!timeSlot) { setFormErrorState('Time slot is required'); return }
      if (!city.trim()) { setFormErrorState('City is required'); return }
      if (!state.trim()) { setFormErrorState('State is required'); return }
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) { setFormErrorState('Latitude must be a number between -90 and 90'); return }
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) { setFormErrorState('Longitude must be a number between -180 and 180'); return }

      setFormErrorState(null)
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
          city,
          state,
          coordinates: [lng, lat],
          devices: deviceIds,
          notes: notes || undefined,
        },
        {
          onSuccess: (res) => {
            if (res.data?.id) {
              navigate(`/camps/${res.data.id}`)
            }
          },
        },
      )
      return
    }

    // The backend treats an absent mr as "leave unchanged," not "clear" — block
    // an empty picker here instead of silently keeping the old MR.
    if (!mr) { setFormErrorState('MR is required'); return }
    if (latitude && (!Number.isFinite(lat) || lat < -90 || lat > 90)) { setFormErrorState('Latitude must be a number between -90 and 90'); return }
    if (longitude && (!Number.isFinite(lng) || lng < -180 || lng > 180)) { setFormErrorState('Longitude must be a number between -180 and 180'); return }

    setFormErrorState(null)
    updateCamp.mutate({
      doctor: doctor || undefined,
      type,
      billingType,
      patientExpectation: patientExpectationNum,
      fo: fo || undefined,
      mr: mr || undefined,
      date: date || undefined,
      timeSlot: timeSlot || undefined,
      city: city || undefined,
      state: state || undefined,
      coordinates: latitude && longitude ? [lng, lat] : undefined,
      devices: deviceIds,
      // Send raw string (not `notes || undefined`) so clearing the textarea to '' actually clears it.
      notes,
    })
  }

  const mutation = isCreateMode ? createCamp : updateCamp

  return (
    <div
      className="rounded-xl border p-5 mb-5"
      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
    >
      <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--qms-text)' }}>
        {isCreateMode ? 'Details' : 'Edit camp'}
      </h2>

      <div className="space-y-4">
        {isCreateMode && (
          <>
            <div>
              <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Company *</Label>
              <TenantPicker tenants={tenants} value={tenant} onValueChange={(v) => { setTenant(v); setField('project', ''); setProjectLabelState(''); setPickedProject(null); setDivision('') }} />
            </div>
            <div>
              <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Project *</Label>
              <ProjectPicker
                value={project}
                label={projectLabel}
                tenant={tenant || undefined}
                onChange={handleProjectChange}
                onClear={() => { setField('project', ''); setProjectLabelState(''); setPickedProject(null); setDivision(''); setField('timeSlot', '') }}
              />
            </div>
            <div>
              <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Division</Label>
              {/* Locked/derived from the picked Project — the backend silently overrides any
                  submitted division with the project's own, so an editable dropdown here is pointless. */}
              <Input value={lockedDivisionName ?? (project ? 'Loading…' : '')} disabled placeholder="Select a project first" />
            </div>
          </>
        )}

        <div>
          <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Doctor *</Label>
          {/* key forces a remount on undefined->defined transitions — base-ui's Select
              otherwise keeps treating it as uncontrolled after the first render. */}
          <Select key={doctor || 'empty'} value={doctor || undefined} onValueChange={(v) => setDoctor(v ?? '')} disabled={isLocked}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select doctor">{(v) => doctorLabel(v as string)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name} ({d.pharmaCode})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as CampType)} disabled={isLocked}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Billing</Label>
            <Select value={billingType} onValueChange={(v) => setBillingType(v as BillingType)} disabled={isLocked}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BILLING_OPTIONS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Patient expectation</Label>
          <Input type="text" inputMode="numeric" value={patientExpectation} onChange={(e) => setPatientExpectation(e.target.value)} placeholder="e.g. 50" disabled={isLocked} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={isLocked} />
          </div>
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Time slot *</Label>
            <Select
              key={timeSlot || 'empty'}
              value={timeSlot || undefined}
              onValueChange={(v) => setTimeSlot(v as CampTimeSlotValue)}
              disabled={isLocked || bookableSlots.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={bookableSlots.length === 0 ? 'Select a project first' : 'Select time slot'}>
                  {(v) => CAMP_TIME_SLOT_LABEL[v as CampTimeSlotValue]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {bookableSlots.map((slot) => <SelectItem key={slot} value={slot}>{CAMP_TIME_SLOT_LABEL[slot]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>City</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} disabled={isLocked} />
          </div>
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>State</Label>
            <Input value={state} onChange={(e) => setState(e.target.value)} disabled={isLocked} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Latitude</Label>
            <Input type="text" inputMode="decimal" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="e.g. 29.2183" disabled={isLocked} />
          </div>
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Longitude</Label>
            <Input type="text" inputMode="decimal" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="e.g. 79.5130" disabled={isLocked} />
          </div>
        </div>
        <p className="text-[11px] -mt-2" style={{ color: 'var(--qms-text-muted)' }}>
          Used to auto-allocate the nearest available field officer if none is picked below.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              Field Officer (optional — auto-assigned if blank)
            </Label>
            <Select key={fo || 'empty'} value={fo || undefined} onValueChange={(v) => setFo(v ?? '')} disabled={isLocked}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Auto-assign nearest FO">{(v) => roleLabel(v as string)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {foRoles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>MR *</Label>
            {/* Clearing this picker and saving is blocked by handleSave's validation — see its comment. */}
            <CampMrPicker
              value={mr}
              label={mrLabel}
              tenant={effectiveTenant || undefined}
              onChange={(id, l) => { setMr(id); setMrLabel(l) }}
              disabled={isLocked}
            />
          </div>
        </div>

        <div>
          <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Devices</Label>
          <InventoryMasterMultiPicker value={deviceIds} labels={deviceLabels} onChange={setDeviceIds} type="device" disabled={isLocked} />
        </div>

        <div>
          <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" disabled={isLocked} />
        </div>
      </div>

      {mutation.isError && (
        <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-4">
          {saveErrorMessage(mutation.error)}
        </div>
      )}
      {mutation.isSuccess && !isCreateMode && (
        <div className="text-xs rounded-xl px-3 py-2 bg-success-soft text-success mt-4">Saved.</div>
      )}
      {formError && (
        <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-4">{formError}</div>
      )}

      {isLocked ? (
        <p className="text-[12px] mt-4" style={{ color: 'var(--qms-text-muted)' }}>
          This camp can only be edited while it's in the "requested" stage. Move it back to make
          changes, or use Move Stage above to change its status.
        </p>
      ) : canWrite ? (
        <Button onClick={handleSave} disabled={mutation.isPending} className="mt-4">
          {mutation.isPending ? 'Saving…' : isCreateMode ? 'Create camp' : 'Save changes'}
        </Button>
      ) : (
        <p className="text-[12px] mt-4" style={{ color: 'var(--qms-text-muted)' }}>
          You have read-only access to this camp.
        </p>
      )}
    </div>
  )
}

export default CampDetailPageReal
