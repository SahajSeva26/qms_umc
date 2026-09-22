import { useRef, useState } from 'react'
import { FiUpload, FiCheckCircle, FiAlertTriangle, FiX } from 'react-icons/fi'
import { DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { getApiErrorMessage } from '@/utils/apiError'
import DoctorScopeFields from '@/features/doctors/components/DoctorScopeFields'
import { useBulkCreateDoctors } from '@/features/doctors/hooks/useBulkCreateDoctors'
import type { DoctorCreateScope } from '@/features/doctors/hooks/useDoctorCreateScope'

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

interface DoctorCsvImportProps {
  scope: DoctorCreateScope
  forcedTenant?: { id: string; label: string }
  forcedDivision?: { id: string; label: string; note?: string }
  onCancel: () => void
}

// Owns its own bulk mutation, file/dropzone state, and result UI entirely — not handed a
// mutation object from the coordinator. Shares tenant/division scope with DoctorSingleForm via
// the passed-down `scope` (useDoctorCreateScope's return value, lifted once in EditDoctorModal).
const DoctorCsvImport = ({ scope, forcedTenant, forcedDivision, onCancel }: DoctorCsvImportProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)

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

  const bulkDivisionId = scope.resolveDivisionId()

  const handleImport = () => {
    if (!file) return
    if (scope.needsTenantPicker && !scope.tenantId) return
    if (!bulkDivisionId) return
    bulkCreateDoctors.mutate(
      { tenant: scope.needsTenantPicker ? scope.tenantId : undefined, division: bulkDivisionId, file },
      { onSuccess: (result) => { if (result.failed === 0 && result.invalidRows === 0) clearSelection() } },
    )
  }

  const bulkResult = bulkCreateDoctors.data
  const canImport = !!file && !(scope.needsTenantPicker && !scope.tenantId) && !!bulkDivisionId && !bulkCreateDoctors.isPending

  return (
    <>
      <div className="space-y-4">
        <DoctorScopeFields scope={scope} isEdit={false} forcedTenant={forcedTenant} forcedDivision={forcedDivision} mode="csv" />

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
            Required columns: pharmaCode, name, specialization, mobile, email, addressLine1, city, state, pincode, longitude, latitude. Optional: addressLine2, locality, country, googlePlaceId, status. Division is set above for the whole file, not per row.
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

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="button" onClick={handleImport} disabled={!canImport}>
          <FiUpload size={14} /> {bulkCreateDoctors.isPending ? 'Importing…' : 'Import doctors'}
        </Button>
      </DialogFooter>
    </>
  )
}

export default DoctorCsvImport
