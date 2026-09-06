import { useRef, useState } from 'react'
import { FiUpload, FiCheckCircle, FiAlertTriangle, FiX } from 'react-icons/fi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import TenantAsyncPicker from '@/components/ui/TenantAsyncPicker'
import { toast } from '@/components/ui/sonner'
import { useCreateDoctor } from '@/features/doctors/hooks/useCreateDoctor'
import { useUpdateDoctor } from '@/features/doctors/hooks/useUpdateDoctor'
import { useBulkCreateDoctors } from '@/features/doctors/hooks/useBulkCreateDoctors'
import { useSession } from '@/hooks/useSession'
import { getApiErrorMessage } from '@/utils/apiError'
import type { DoctorEntity, DoctorSpecialization, DoctorStatus } from '@/types/doctor.types'

const SPECIALIZATION_OPTIONS: { value: DoctorSpecialization; label: string }[] = [
  { value: 'cp', label: 'CP' },
  { value: 'gp', label: 'GP' },
]

const STATUS_OPTIONS: { value: DoctorStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

// A bulk-import row error is either a plain string (DB-layer failure) or a
// field-name -> message map (Zod validation failure) — no `.message` to fall back on.
function formatBulkDoctorRowError(error: string | Record<string, unknown>): string {
  if (typeof error === 'string') return error
  return Object.entries(error)
    .map(([field, message]) => `${field}: ${message}`)
    .join('; ')
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.round(bytes / 1024)} KB`
}

interface DoctorDraft {
  pharmaCode: string
  name: string
  specialization: DoctorSpecialization
  mobile: string
  city: string
  state: string
  pincode: string
  email: string
  googleMapLink: string
  status: DoctorStatus
  tenantId: string
  tenantLabel: string
}

const emptyDraft: DoctorDraft = { pharmaCode: '', name: '', specialization: 'cp', mobile: '', city: '', state: '', pincode: '', email: '', googleMapLink: '', status: 'active', tenantId: '', tenantLabel: '' }

function draftFromDoctor(d: DoctorEntity): DoctorDraft {
  return {
    pharmaCode: d.pharmaCode,
    name: d.name,
    specialization: d.specialization,
    mobile: d.mobile,
    city: d.city,
    state: d.state,
    pincode: d.pincode,
    email: d.email,
    googleMapLink: d.googleMapLink || '',
    status: d.status ?? 'active',
    // tenant is immutable post-create — Edit never renders or submits this field.
    tenantId: '',
    tenantLabel: '',
  }
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
}

// Keyed on doctor id so the inner form remounts (resetting draft state)
// per doctor without needing a useEffect to re-sync from props.
const EditDoctorModal = ({ open, doctor, onClose, onCreated, forcedTenant }: EditDoctorModalProps) => {
  if (!open) return null
  return <EditDoctorModalForm key={doctor?.id ?? '__new__'} doctor={doctor} onClose={onClose} onCreated={onCreated} forcedTenant={forcedTenant} />
}

interface EditDoctorModalFormProps {
  doctor: DoctorEntity | null
  onClose: () => void
  onCreated?: (doctor: DoctorEntity) => void
  forcedTenant?: { id: string; label: string }
}

const EditDoctorModalForm = ({ doctor, onClose, onCreated, forcedTenant }: EditDoctorModalFormProps) => {
  const isEdit = !!doctor
  const [draft, setDraft] = useState<DoctorDraft>(doctor ? draftFromDoctor(doctor) : emptyDraft)
  const { session } = useSession()
  // A platform caller has no single "home" tenant and must pick one; a
  // customer caller's submitted tenant is ignored server-side either way.
  const needsTenantPicker = !isEdit && !forcedTenant && session?.tenant?.type === 'platform'

  // Forced-tenant inline callers rely on onCreated firing with ONE created
  // doctor to auto-select — a bulk import can't satisfy that.
  const showToggle = !isEdit && !forcedTenant
  const [mode, setMode] = useState<'single' | 'csv'>('single')
  const activeMode = showToggle ? mode : 'single'
  const switchMode = (next: 'single' | 'csv') => setMode(next)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)

  const createDoctor = useCreateDoctor()
  const updateDoctor = useUpdateDoctor(doctor?.id ?? '')
  const bulkCreateDoctors = useBulkCreateDoctors()

  const handlePickFile = (picked: File | null) => {
    setFile(picked)
    bulkCreateDoctors.reset()
  }

  // Also resets the native input's value so re-picking the same file still
  // fires onChange; leaves any in-flight result/error untouched.
  const clearSelection = () => {
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // An explicit user-driven Remove additionally drops any stale error/result
  // from a previous attempt, unlike the success-driven auto-clear above.
  const removeFile = () => {
    clearSelection()
    bulkCreateDoctors.reset()
  }

  // Without this reset, re-picking the same file wouldn't fire onChange —
  // the input's value never actually changed from the browser's perspective.
  const openFilePicker = () => {
    if (fileInputRef.current) fileInputRef.current.value = ''
    fileInputRef.current?.click()
  }

  const handleImport = () => {
    if (!file) return
    if (needsTenantPicker && !draft.tenantId) return
    bulkCreateDoctors.mutate(
      { tenant: needsTenantPicker ? draft.tenantId : undefined, file },
      { onSuccess: (result) => { if (result.failed === 0 && result.invalidRows === 0) clearSelection() } },
    )
  }

  const bulkResult = bulkCreateDoctors.data
  const canImport = !!file && !(needsTenantPicker && !draft.tenantId) && !bulkCreateDoctors.isPending

  const handleClose = () => onClose()

  const handleSave = async () => {
    if (!draft.name.trim()) {
      toast.error('Doctor name is required')
      return
    }

    try {
      if (isEdit) {
        // pharmaCode is immutable — not sent on update (matches backend's
        // UpdateDoctorPayloadSchema, which has no pharmaCode field at all).
        await updateDoctor.mutateAsync({
          name: draft.name,
          specialization: draft.specialization,
          mobile: draft.mobile,
          city: draft.city,
          state: draft.state,
          pincode: draft.pincode,
          email: draft.email,
          googleMapLink: draft.googleMapLink || undefined,
          status: draft.status,
        })
        toast.success('Doctor updated')
      } else {
        if (!draft.pharmaCode.trim()) {
          toast.error('Pharma doctor code is required')
          return
        }
        if (needsTenantPicker && !draft.tenantId) {
          toast.error('Company is required')
          return
        }
        const created = await createDoctor.mutateAsync({
          pharmaCode: draft.pharmaCode,
          name: draft.name,
          specialization: draft.specialization,
          mobile: draft.mobile,
          city: draft.city,
          state: draft.state,
          pincode: draft.pincode,
          email: draft.email,
          googleMapLink: draft.googleMapLink || undefined,
          tenant: forcedTenant ? forcedTenant.id : needsTenantPicker ? draft.tenantId : undefined,
        })
        toast.success('Doctor added')
        if (created.data) onCreated?.(created.data)
      }
      handleClose()
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not save doctor — try again.'))
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!isEdit && forcedTenant && (
              <div className="sm:col-span-2">
                <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Company</label>
                <p className="text-[13px]" style={{ color: 'var(--qms-text)' }}>{forcedTenant.label} <span style={{ color: 'var(--qms-text-muted)' }}>(locked to the camp being booked)</span></p>
              </div>
            )}
            {needsTenantPicker && (
              <div className="sm:col-span-2">
                <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Company *</label>
                <TenantAsyncPicker
                  value={draft.tenantId}
                  label={draft.tenantLabel}
                  onChange={(tenantId, tenantLabel) => setDraft((p) => ({ ...p, tenantId, tenantLabel }))}
                />
              </div>
            )}
            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Pharma doctor code</label>
              <Input
                value={draft.pharmaCode}
                onChange={(e) => setDraft((p) => ({ ...p, pharmaCode: e.target.value }))}
                disabled={isEdit}
              />
            </div>
            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Doctor name</label>
              <Input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Specialization</label>
              <Select value={draft.specialization} onValueChange={(v) => setDraft((p) => ({ ...p, specialization: v as DoctorSpecialization }))}>
                <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SPECIALIZATION_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Mobile</label>
              <Input value={draft.mobile} onChange={(e) => setDraft((p) => ({ ...p, mobile: e.target.value }))} />
            </div>
            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>City</label>
              <Input value={draft.city} onChange={(e) => setDraft((p) => ({ ...p, city: e.target.value }))} />
            </div>
            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>State</label>
              <Input value={draft.state} onChange={(e) => setDraft((p) => ({ ...p, state: e.target.value }))} />
            </div>
            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Pincode</label>
              <Input value={draft.pincode} onChange={(e) => setDraft((p) => ({ ...p, pincode: e.target.value }))} />
            </div>
            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Email</label>
              <Input value={draft.email} onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Google Maps link</label>
              <Input value={draft.googleMapLink} onChange={(e) => setDraft((p) => ({ ...p, googleMapLink: e.target.value }))} />
            </div>
            {isEdit && (
              <div>
                <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Status</label>
                <Select value={draft.status} onValueChange={(v) => setDraft((p) => ({ ...p, status: v as DoctorStatus }))}>
                  <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {needsTenantPicker && (
              <div>
                <Label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Company *</Label>
                <TenantAsyncPicker
                  value={draft.tenantId}
                  label={draft.tenantLabel}
                  onChange={(tenantId, tenantLabel) => setDraft((p) => ({ ...p, tenantId, tenantLabel }))}
                />
              </div>
            )}

            <div>
              <Label htmlFor="doctor-bulk-csv" className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                CSV file *
              </Label>
              {file ? (
                <div className="rounded-xl border border-success bg-success-soft px-4 py-3 flex items-center gap-3 text-success">
                  <FiCheckCircle size={18} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold truncate" title={file.name}>{file.name}</p>
                    <p className="text-[11px] opacity-80">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={openFilePicker}
                    className="text-[12px] font-semibold underline decoration-dotted underline-offset-2 hover:no-underline shrink-0"
                  >
                    Change file
                  </button>
                  <button
                    type="button"
                    onClick={removeFile}
                    aria-label="Remove selected file"
                    className="shrink-0 rounded-full p-1 hover:bg-black/5"
                  >
                    <FiX size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="w-full rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
                  style={{ borderColor: 'var(--qms-border)' }}
                >
                  <FiUpload size={20} className="mx-auto mb-1.5" style={{ color: 'var(--qms-text-muted)' }} />
                  <p className="text-[13px] font-semibold" style={{ color: 'var(--qms-text)' }}>
                    Click to choose a CSV file
                  </p>
                </button>
              )}
              <input
                id="doctor-bulk-csv"
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => handlePickFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
                Required columns: pharmaCode, name, specialization, mobile, city, state, pincode, email. Optional: googleMapLink, status.
              </p>
            </div>

            {bulkCreateDoctors.isError && (
              <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
                {getApiErrorMessage(bulkCreateDoctors.error, 'Could not import doctors — try again.')}
              </div>
            )}

            {bulkResult && (
              <div
                className="text-[12px] rounded-xl px-3 py-2.5 space-y-1.5"
                style={{ background: 'var(--qms-surface-strong)' }}
              >
                <div className="flex items-center gap-2 font-semibold" style={{ color: 'var(--qms-text)' }}>
                  {bulkResult.failed === 0 && bulkResult.invalidRows === 0 ? (
                    <FiCheckCircle style={{ color: 'var(--success)' }} />
                  ) : (
                    <FiAlertTriangle className="text-danger" />
                  )}
                  <span>{bulkResult.created} of {bulkResult.totalRows} rows imported successfully</span>
                </div>
                {bulkResult.invalidRows > 0 && (
                  <div style={{ color: 'var(--qms-text-muted)' }}>
                    {bulkResult.invalidRows} row{bulkResult.invalidRows === 1 ? '' : 's'} skipped for invalid/missing data.
                  </div>
                )}
                {bulkResult.errors.length > 0 && (
                  <div className="space-y-0.5 text-danger">
                    {bulkResult.errors.map((e, i) => (
                      <div key={i}>
                        Row {e.row}: {formatBulkDoctorRowError(e.error)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          {activeMode === 'single' ? (
            <Button onClick={handleSave} disabled={isSaving}>{isEdit ? 'Save changes' : 'Add doctor'}</Button>
          ) : (
            <Button onClick={handleImport} disabled={!canImport}>
              <FiUpload size={14} /> {bulkCreateDoctors.isPending ? 'Importing…' : 'Import doctors'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EditDoctorModal
