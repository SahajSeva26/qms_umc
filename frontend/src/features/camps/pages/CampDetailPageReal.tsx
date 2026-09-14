import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { useCreateCamp } from '@/features/camps/hooks/useCreateCamp'
import { useCampPickerData } from '@/features/camps/hooks/useCampPickerData'
import { useCampDraft } from '@/features/camps/hooks/useCampDraft'
import { campRefId, saveErrorMessage } from '@/features/camps/campsReal.utils'
import { usePermission } from '@/hooks/usePermission'
import ProjectPicker from '@/features/camps/components/ProjectPicker'
import CampFormFields from '@/features/camps/components/CampFormFields'
import EditDoctorModal from '@/features/doctors/components/EditDoctorModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import TenantPicker from '@/components/ui/TenantPicker'
import type { CampTimeSlotValue } from '@/types/campTimeSlot.constants'
import type { ProjectEntity } from '@/types/project.types'
import type { DoctorEntity } from '@/types/doctor.types'
import type { LocationValue } from '@/types/location.types'
import type { LocationResolutionState } from '@/components/widgets/location-picker/location.types'

// create (camp:create) is a distinct backend permission from update — this
// page only ever handles creation, so only the create code is checked here.
const CAMP_CREATE_PERMISSIONS = ['camp:create', 'camp:manage', 'tenant:manage']

const CampDetailPageReal = () => {
  const navigate = useNavigate()
  const { hasAnyPermission, hasPermission } = usePermission()
  const canWrite = hasAnyPermission(CAMP_CREATE_PERMISSIONS)
  const canManageDoctors = hasPermission('doctor:manage')

  const { draft, setField } = useCampDraft(null)
  const { tenant, division, project, doctor, mr, date, timeSlot, location, devices, notes, type, billingType, patientExpectation, fo } = draft

  // A caller-facing pin can visibly move well before (or without ever) firing
  // onChange — Save must block until the picker settles, same as GeoProfileDetailPage.
  const [locationResolution, setLocationResolution] = useState<LocationResolutionState>('idle')

  const [mrLabel, setMrLabel] = useState('')
  const [foLabel, setFoLabel] = useState('')
  const [projectLabel, setProjectLabelState] = useState('')
  const [deviceLabels, setDeviceLabels] = useState<Record<string, string>>({})
  const [pickedProject, setPickedProject] = useState<ProjectEntity | null>(null)
  const [localDoctors, setLocalDoctors] = useState<DoctorEntity[]>([])
  const [showNewDoctor, setShowNewDoctor] = useState(false)

  const effectiveTenant = tenant

  const { tenants, doctors: fetchedDoctors } = useCampPickerData(true, effectiveTenant)
  // Locally merges a just-created doctor in immediately — a query invalidation
  // could still land on a limit:10 page that doesn't include it.
  const doctors = [...fetchedDoctors, ...localDoctors.filter((d) => !fetchedDoctors.some((f) => f.id === d.id))]

  const doctorLabel = (id: string) => {
    if (id) return doctors.find((d) => d.id === id)?.name ?? id
    return effectiveTenant ? 'Select doctor' : 'Select company first'
  }

  const bookableSlots = pickedProject?.campTimeSlots ?? []
  const lockedDivisionName = pickedProject ? pickedProject.division && typeof pickedProject.division !== 'string' ? (pickedProject.division as { name?: string }).name ?? null : null : null

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
          if (res.data?.id) {
            navigate(`/camps?camp=${res.data.id}`)
          }
        },
      },
    )
  }

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
                setField('project', '')
                setProjectLabelState('')
                setPickedProject(null)
                setField('division', '')
                // A doctor (fetched or just-created) scoped to the old company is no longer valid.
                setField('doctor', '')
                setLocalDoctors([])
                // An MR/FO scoped to the old company is no longer valid either — same
                // reasoning as doctor above.
                setField('mr', '')
                setMrLabel('')
                setField('fo', '')
                setFoLabel('')
              }}
            />
          </div>
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Project *</Label>
            <ProjectPicker
              value={project}
              label={projectLabel}
              tenant={tenant || undefined}
              onChange={handleProjectChange}
              onClear={() => { setField('project', ''); setProjectLabelState(''); setPickedProject(null); setField('division', ''); setField('timeSlot', '') }}
            />
          </div>
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Division</Label>
            {/* Locked/derived from the picked Project — the backend silently overrides any
                submitted division with the project's own, so an editable dropdown here is pointless. */}
            <Input value={lockedDivisionName ?? (project ? 'Loading…' : '')} disabled placeholder="Select a project first" />
          </div>

          {showNewDoctor && (
            <EditDoctorModal
              open
              doctor={null}
              forcedTenant={{ id: effectiveTenant, label: tenants.find((t) => t.id === effectiveTenant)?.name ?? effectiveTenant }}
              onCreated={(created) => {
                setLocalDoctors((prev) => [...prev, created])
                setField('doctor', created.id)
              }}
              onClose={() => setShowNewDoctor(false)}
            />
          )}

          <CampFormFields
            draft={draft}
            setField={setField}
            effectiveTenant={effectiveTenant}
            isLocked={false}
            doctors={doctors}
            doctorLabel={doctorLabel}
            showNewDoctorButton={canManageDoctors}
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
