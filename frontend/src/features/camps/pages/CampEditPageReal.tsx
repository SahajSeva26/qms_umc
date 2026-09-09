import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { useCampReal } from '@/features/camps/hooks/useCampReal'
import { useUpdateCamp } from '@/features/camps/hooks/useUpdateCamp'
import { useCampDraft } from '@/features/camps/hooks/useCampDraft'
import { useProject } from '@/features/projects/hooks/useProject'
import { useDoctors } from '@/features/doctors/hooks/useDoctors'
import { campRefId, campRefName, saveErrorMessage } from '@/features/camps/campsReal.utils'
import { usePermission } from '@/hooks/usePermission'
import CampFormFields from '@/features/camps/components/CampFormFields'
import { Button } from '@/components/ui/button'
import type { CampEntity } from '@/types/campReal.types'
import type { LocationResolutionState } from '@/components/widgets/location-picker/location.types'

// create (camp:create) and update (camp:update) are two distinct backend
// permission codes — a create-only actor can't edit this page.
const CAMP_UPDATE_PERMISSIONS = ['camp:update', 'camp:manage', 'tenant:manage']

const CampEditPageReal = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  // Real browser back when we arrived via a push from the drawer (avoids a
  // Back/forward loop where "Back to camp" itself pushes another entry) —
  // falls back to the explicit URL for a direct/bookmarked link to this page.
  const arrivedFromDrawer = (location.state as { fromDrawer?: boolean } | null)?.fromDrawer === true
  const goBackToCamp = () => {
    if (arrivedFromDrawer) navigate(-1)
    // Direct/bookmarked/refreshed load — there's no drawer entry to pop back
    // to, so replace this entry instead of pushing a new one (otherwise
    // browser Back from the drawer would return here, not leave the page).
    else navigate(id ? `/camps?camp=${id}` : '/camps', { replace: true })
  }

  const { data, isLoading, error } = useCampReal(id)
  const camp = data?.data ?? null

  return (
    <div className="max-w-3xl">
      <button
        onClick={goBackToCamp}
        className="flex items-center gap-1.5 text-[13px] font-semibold mb-5 transition-colors hover:opacity-80"
        style={{ color: 'var(--qms-text-soft)' }}
      >
        <FiArrowLeft size={14} />
        Back to camp
      </button>

      {isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading camp…
        </div>
      )}

      {error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load camp. Please try again.
        </div>
      )}

      {/* key={camp.id} forces a fresh draft when a background refetch swaps
          in a different camp object — mirrors CampForm's own remount-by-key contract. */}
      {camp && !isLoading && <CampEditForm key={camp.id} camp={camp} />}
    </div>
  )
}

interface CampEditFormProps {
  camp: CampEntity
}

// Everything here is locked (disabled, not just save-blocked) once the camp
// leaves `requested` — the backend 409s the WHOLE update, not just fo/date.
const CampEditForm = ({ camp }: CampEditFormProps) => {
  const navigate = useNavigate()
  const { hasAnyPermission } = usePermission()
  const canWrite = hasAnyPermission(CAMP_UPDATE_PERMISSIONS)

  const { draft, setField } = useCampDraft(camp)
  const { doctor, fo, mr, date, timeSlot, location, devices, notes, type, billingType, patientExpectation } = draft

  const [locationResolution, setLocationResolution] = useState<LocationResolutionState>('idle')
  const [mrLabel, setMrLabel] = useState(() => campRefName(camp.mr) ?? '')
  const [foLabel, setFoLabel] = useState(() => campRefName(camp.fo) ?? '')
  const [deviceLabels, setDeviceLabels] = useState<Record<string, string>>(() =>
    Object.fromEntries(camp.devices.map((d) => [d._id, `${d.name} (${d.code})`])),
  )

  const effectiveTenant = campRefId(camp.tenant) || ''
  const isLocked = camp.status !== 'requested'

  const { data: doctorsData } = useDoctors({ limit: '10', tenant: effectiveTenant || undefined }, { enabled: !!effectiveTenant })
  const doctors = doctorsData?.data?.items ?? []
  const doctorLabel = (id: string) => {
    if (id) return doctors.find((d) => d.id === id)?.name ?? campRefName(camp.doctor) ?? id
    return effectiveTenant ? 'Select doctor' : 'Select company first'
  }

  // A camp's own `project` populate is slim ({_id,name,status}, no campTimeSlots) —
  // fetch the full project separately so the time-slot Select can be scoped.
  const { data: editProjectData } = useProject(camp.project ? campRefId(camp.project) ?? undefined : undefined)
  const editProject = editProjectData?.data ?? null
  const bookableSlots = editProject?.campTimeSlots ?? []

  const deviceIds = devices ? devices.split(',').map((d) => d.trim()).filter(Boolean) : []
  const sortedIds = (ids: string[]) => [...ids].sort().join(',')
  const originalDeviceIds = sortedIds(camp.devices.map((d) => d._id))

  const updateCamp = useUpdateCamp(camp.id)
  const [formError, setFormError] = useState<string | null>(null)

  const handleSave = () => {
    if (locationResolution === 'loading') { setFormError('Still resolving the picked location — wait a moment and try again'); return }
    if (locationResolution === 'error') { setFormError('Retry or choose "Use this pin" for the location before saving'); return }
    // The backend treats an absent mr as "leave unchanged," not "clear" — block
    // an empty picker here instead of silently keeping the old MR.
    if (!mr) { setFormError('MR is required'); return }
    // Only validated when the user has actually set a location — a legacy
    // camp's location may load as null and must be allowed to stay that way.
    if (location && (!location.coordinates || !location.addressLine1.trim() || !location.city.trim() || !location.state.trim() || !location.pincode.trim())) {
      setFormError('Complete the address (street, city, state, pincode) or leave it unset'); return
    }

    setFormError(null)
    const patientExpectationNum = patientExpectation ? Number(patientExpectation) : undefined
    updateCamp.mutate(
      {
        doctor: doctor || undefined,
        fo: fo || undefined,
        mr: mr || undefined,
        date: date || undefined,
        timeSlot: timeSlot || undefined,
        // Omitted (not sent as null) when unset, so the backend's replace-wholesale
        // update semantics leave an untouched legacy-null location alone.
        location: location ?? undefined,
        // Send raw string (not `notes || undefined`) so clearing the textarea to '' actually clears it.
        notes,
        // Backend leaves an absent key unchanged — omit unless the final value actually differs from the original.
        ...(type !== camp.type ? { type } : {}),
        ...(billingType !== camp.billingType ? { billingType } : {}),
        ...(patientExpectationNum !== camp.patientExpectation ? { patientExpectation: patientExpectationNum } : {}),
        ...(sortedIds(deviceIds) !== originalDeviceIds ? { devices: deviceIds } : {}),
      },
      {
        // replace, not push — a successful save shouldn't leave the edit page
        // as a Back-able history step; landing back on the drawer is the only
        // sensible "undo" of a save.
        onSuccess: () => navigate(`/camps?camp=${camp.id}`, { replace: true }),
      },
    )
  }

  return (
    <div
      className="rounded-xl border p-5"
      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
    >
      <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--qms-text)' }}>Edit camp {camp.code}</h2>

      <CampFormFields
        draft={draft}
        setField={setField}
        effectiveTenant={effectiveTenant}
        isLocked={isLocked || !canWrite}
        doctors={doctors}
        doctorLabel={doctorLabel}
        showNewDoctorButton={false}
        onNewDoctor={() => {}}
        bookableSlots={bookableSlots}
        timeSlotDisabledPlaceholder="No project time slots available"
        mrLabel={mrLabel}
        setMrLabel={setMrLabel}
        foLabel={foLabel}
        setFoLabel={setFoLabel}
        deviceLabels={deviceLabels}
        onDevicesChange={(ids, labels) => { setField('devices', ids.join(', ')); setDeviceLabels(labels) }}
        onLocationResolutionChange={setLocationResolution}
      />

      {updateCamp.isError && (
        <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-4">
          {saveErrorMessage(updateCamp.error)}
        </div>
      )}
      {formError && (
        <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-4">{formError}</div>
      )}

      {isLocked ? (
        <p className="text-[12px] mt-4" style={{ color: 'var(--qms-text-muted)' }}>
          This camp can only be edited while it's in the "requested" stage. Move it back to make
          changes, or use Move Stage to change its status.
        </p>
      ) : canWrite ? (
        <Button onClick={handleSave} disabled={updateCamp.isPending || locationResolution === 'loading'} className="mt-4">
          {updateCamp.isPending ? 'Saving…' : locationResolution === 'loading' ? 'Resolving location…' : 'Save changes'}
        </Button>
      ) : (
        <p className="text-[12px] mt-4" style={{ color: 'var(--qms-text-muted)' }}>
          You have read-only access to this camp.
        </p>
      )}
    </div>
  )
}

export default CampEditPageReal
