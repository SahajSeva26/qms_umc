import { useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { useCampReal } from '@/features/camps/hooks/useCampReal'
import { useUpdateCamp } from '@/features/camps/hooks/useUpdateCamp'
import { useCampDraft } from '@/features/camps/hooks/useCampDraft'
import { useProject } from '@/features/projects/hooks/useProject'
import { useDoctorSearch as useDoctors } from '@/hooks/useDoctorSearch'
import { campRefId, campRefName, saveErrorMessage, withCampParam } from '@/features/camps/campsReal.utils'
import { usePermission } from '@/hooks/usePermission'
import CampFormFields from '@/features/camps/components/CampFormFields'
import { Button } from '@/components/ui/button'
import type { CampEntity } from '@/types/campReal.types'
import type { LocationResolutionState } from '@/components/widgets/location-picker/location.types'

// create and update are distinct permissions — a create-only actor can't edit this page.
const CAMP_UPDATE_PERMISSIONS = ['camp:update', 'camp:manage', 'tenant:manage']

const CampEditPageReal = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('from') || (id ? `/camps?camp=${id}` : '/camps')
  // A direct/bookmarked load has no history entry to pop back to, so it can't use navigate(-1).
  const arrivedFromDrawer = (location.state as { fromDrawer?: boolean } | null)?.fromDrawer === true
  const goBackToCamp = () => {
    if (arrivedFromDrawer) navigate(-1)
    else navigate(returnTo, { replace: true })
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

      {/* key={camp.id} forces a fresh draft when a background refetch swaps in a different camp. */}
      {camp && !isLoading && <CampEditForm key={camp.id} camp={camp} returnTo={returnTo} />}
    </div>
  )
}

interface CampEditFormProps {
  camp: CampEntity
  returnTo: string
}

// Locked once the camp leaves `requested` — the backend 409s the whole update, not just fo/date.
const CampEditForm = ({ camp, returnTo }: CampEditFormProps) => {
  const navigate = useNavigate()
  const { hasAnyPermission } = usePermission()
  const canWrite = hasAnyPermission(CAMP_UPDATE_PERMISSIONS)

  const { draft, setField } = useCampDraft(camp)
  const { doctor, fo, dietitian, mr, date, timeSlot, location, devices, notes, billingType, patientExpectation } = draft

  const [locationResolution, setLocationResolution] = useState<LocationResolutionState>('idle')
  const [mrLabel, setMrLabel] = useState(() => campRefName(camp.mr) ?? '')
  const [foLabel, setFoLabel] = useState(() => campRefName(camp.fo) ?? '')
  const [dietitianLabel, setDietitianLabel] = useState(() => campRefName(camp.dietitian) ?? '')
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

  // camp.project is a slim populate (no campTimeSlots) — refetch the full project for the time-slot Select.
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
    // An absent mr means "leave unchanged" server-side, so block an empty picker instead of silently keeping the old MR.
    if (!mr) { setFormError('MR is required'); return }
    // Only validated once a location is set — a legacy camp may load with location: null.
    if (location && (!location.coordinates || !location.addressLine1.trim() || !location.city.trim() || !location.state.trim() || !location.pincode.trim())) {
      setFormError('Complete the address (street, city, state, pincode) or leave it unset'); return
    }

    setFormError(null)
    const patientExpectationNum = patientExpectation ? Number(patientExpectation) : undefined
    updateCamp.mutate(
      {
        doctor: doctor || undefined,
        // A legacy diet camp can carry a historic `fo` from before dietitian support — send only the matching field.
        ...(camp.type === 'diet' ? { dietitian: dietitian || undefined } : { fo: fo || undefined }),
        mr: mr || undefined,
        date: date || undefined,
        timeSlot: timeSlot || undefined,
        // Omitted (not null) when unset, so an untouched legacy-null location stays alone.
        location: location ?? undefined,
        // Raw string, not `notes || undefined` — clearing the textarea to '' must actually clear it.
        notes,
        // Backend leaves an absent key unchanged — omit unless the final value differs from the original.
        ...(billingType !== camp.billingType ? { billingType } : {}),
        ...(patientExpectationNum !== camp.patientExpectation ? { patientExpectation: patientExpectationNum } : {}),
        ...(sortedIds(deviceIds) !== originalDeviceIds ? { devices: deviceIds } : {}),
      },
      {
        // replace: a save shouldn't leave the edit page as a Back-able history step.
        onSuccess: () => navigate(withCampParam(returnTo, camp.id), { replace: true }),
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
        mode="edit"
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
        dietitianLabel={dietitianLabel}
        setDietitianLabel={setDietitianLabel}
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
