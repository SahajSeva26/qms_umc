import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/components/ui/sonner'
import { useSession } from '@/hooks/useSession'
import { getApiErrorMessage } from '@/utils/apiError'
import { useCreateDoctor } from '@/features/doctors/hooks/useCreateDoctor'
import { useUpdateDoctor } from '@/features/doctors/hooks/useUpdateDoctor'
import { useDoctorCreateScope } from '@/features/doctors/hooks/useDoctorCreateScope'
import DoctorSingleForm from '@/features/doctors/components/DoctorSingleForm'
import DoctorCsvImport from '@/features/doctors/components/DoctorCsvImport'
import type { CreateDoctorPayload, DoctorEntity, UpdateDoctorPayload } from '@/types/doctor.types'

// Create/update's 400 body is { message: 'Validation Error', data: { fields: {field: reason} } } —
// the generic getApiErrorMessage only reads the top-level `message`, which is just "Validation
// Error" here and tells the user nothing about which field actually failed (e.g. an invalid email
// format). Unpack the per-field reasons first, matching campsReal.utils.ts's saveErrorMessage.
function saveDoctorErrorMessage(err: unknown, fallback: string): string {
  const response = (err as { response?: { data?: { message?: string; data?: { fields?: Record<string, string> } } } })?.response
  const fields = response?.data?.data?.fields
  if (fields && Object.keys(fields).length > 0) {
    return Object.entries(fields).map(([field, reason]) => `${field}: ${reason}`).join('; ')
  }
  return getApiErrorMessage(err, fallback)
}

interface EditDoctorModalProps {
  open: boolean
  doctor: DoctorEntity | null
  onClose: () => void
  /** Fires only on a genuine create success — lets a caller auto-select the
   * new doctor without overloading onClose's "dismissed" meaning. */
  onCreated?: (doctor: DoctorEntity) => void
  /** Locks create mode to a specific company: the picker becomes read-only
   * context text, and this id is submitted regardless of session type. */
  forcedTenant?: { id: string; label: string }
  /** Locks create mode to a specific division within forcedTenant, same treatment as forcedTenant.
   * `note` explains why it's locked (caller-specific); falls back to a default wording if omitted. */
  forcedDivision?: { id: string; label: string; note?: string }
}

// Keyed on doctor id so the inner form remounts (resetting draft state)
// per doctor without needing a useEffect to re-sync from props.
const EditDoctorModal = ({ open, doctor, onClose, onCreated, forcedTenant, forcedDivision }: EditDoctorModalProps) => {
  if (!open) return null
  return (
    <EditDoctorModalForm
      key={doctor?.id ?? '__new__'}
      doctor={doctor}
      onClose={onClose}
      onCreated={onCreated}
      forcedTenant={forcedTenant}
      forcedDivision={forcedDivision}
    />
  )
}

interface EditDoctorModalFormProps {
  doctor: DoctorEntity | null
  onClose: () => void
  onCreated?: (doctor: DoctorEntity) => void
  forcedTenant?: { id: string; label: string }
  forcedDivision?: { id: string; label: string; note?: string }
}

const EditDoctorModalForm = ({ doctor, onClose, onCreated, forcedTenant, forcedDivision }: EditDoctorModalFormProps) => {
  const isEdit = !!doctor
  const { session } = useSession()

  const scope = useDoctorCreateScope({ isEdit, session, forcedTenant, forcedDivision })

  // Forced-tenant inline callers rely on onCreated firing with ONE created
  // doctor to auto-select — a bulk import can't satisfy that.
  const showToggle = !isEdit && !forcedTenant
  const [mode, setMode] = useState<'single' | 'csv'>('single')
  const activeMode = showToggle ? mode : 'single'
  const switchMode = (next: 'single' | 'csv') => setMode(next)

  const createDoctor = useCreateDoctor()
  const updateDoctor = useUpdateDoctor(doctor?.id ?? '')

  const handleClose = () => onClose()

  const handleSubmit = async (payload: CreateDoctorPayload | UpdateDoctorPayload) => {
    try {
      if (isEdit) {
        await updateDoctor.mutateAsync(payload as UpdateDoctorPayload)
        toast.success('Doctor updated')
      } else {
        const created = await createDoctor.mutateAsync(payload as CreateDoctorPayload)
        toast.success('Doctor added')
        if (created.data) onCreated?.(created.data)
      }
      handleClose()
    } catch (err) {
      toast.error(saveDoctorErrorMessage(err, 'Could not save doctor — try again.'))
    }
  }

  const isSaving = createDoctor.isPending || updateDoctor.isPending

  return (
    <Dialog open onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit doctor' : 'Add doctor'}</DialogTitle>
        </DialogHeader>

        {showToggle && (
          <div
            className="inline-flex gap-1 p-1 rounded-[10px] mb-1"
            style={{ background: 'var(--qms-surface-strong, rgba(0,0,0,.04))' }}
          >
            <button
              type="button"
              aria-pressed={activeMode === 'single'}
              onClick={() => switchMode('single')}
              className="rounded-lg text-xs font-bold border-0"
              style={{
                padding: '6px 14px',
                background: activeMode === 'single' ? 'var(--qms-card)' : 'transparent',
                color: activeMode === 'single' ? 'var(--qms-text)' : 'var(--qms-text-muted)',
                boxShadow: activeMode === 'single' ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
              }}
            >
              Single
            </button>
            <button
              type="button"
              aria-pressed={activeMode === 'csv'}
              onClick={() => switchMode('csv')}
              className="rounded-lg text-xs font-bold border-0"
              style={{
                padding: '6px 14px',
                background: activeMode === 'csv' ? 'var(--qms-card)' : 'transparent',
                color: activeMode === 'csv' ? 'var(--qms-text)' : 'var(--qms-text-muted)',
                boxShadow: activeMode === 'csv' ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
              }}
            >
              CSV
            </button>
          </div>
        )}

        {activeMode === 'single' ? (
          <DoctorSingleForm
            doctor={doctor}
            scope={scope}
            forcedTenant={forcedTenant}
            forcedDivision={forcedDivision}
            onSubmit={handleSubmit}
            onCancel={handleClose}
            isSaving={isSaving}
          />
        ) : (
          <DoctorCsvImport
            scope={scope}
            forcedTenant={forcedTenant}
            forcedDivision={forcedDivision}
            onCancel={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

export default EditDoctorModal
