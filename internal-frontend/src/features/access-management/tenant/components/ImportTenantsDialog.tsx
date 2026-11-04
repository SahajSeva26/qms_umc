import { useRef, useState } from 'react'
import { FiAlertTriangle, FiCheckCircle, FiUpload, FiX } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useBulkCreateTenants } from '@/features/access-management/tenant/hooks/useBulkCreateTenants'
import { getApiErrorMessage } from '@/utils/apiError'

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function formatRowError(error: unknown): string {
  if (typeof error === 'string') return error
  if (!error || typeof error !== 'object') return String(error ?? 'Unknown row error')
  return Object.entries(error)
    .map(([field, message]) => `${field}: ${String(message)}`)
    .join('; ')
}

const ImportTenantsDialog = () => {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const importTenants = useBulkCreateTenants()

  const clearFile = () => {
    setFile(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const resetAndClose = () => {
    clearFile()
    importTenants.reset()
    setOpen(false)
  }

  const chooseFile = () => {
    if (inputRef.current) inputRef.current.value = ''
    inputRef.current?.click()
  }

  const handleFile = (next: File | null) => {
    setFile(next)
    importTenants.reset()
  }

  const handleImport = () => {
    if (!file) return
    importTenants.mutate(file, {
      onSuccess: (result) => {
        if (result.failed === 0) clearFile()
      },
    })
  }

  const result = importTenants.data

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : resetAndClose())}>
      <Button type="button" variant="outline" onClick={() => setOpen(true)} className="shrink-0">
        <FiUpload size={14} /> Import clients
      </Button>

      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import clients from CSV</DialogTitle>
          <DialogDescription>
            Each row creates one customer client and its initial admin account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {file ? (
            <div className="flex items-center gap-3 rounded-xl border border-success bg-success-soft px-4 py-3 text-success">
              <FiCheckCircle size={18} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold" title={file.name}>{file.name}</p>
                <p className="text-[11px] opacity-80">{formatFileSize(file.size)}</p>
              </div>
              <button type="button" onClick={chooseFile} className="shrink-0 text-[12px] font-semibold underline decoration-dotted underline-offset-2">
                Change
              </button>
              <button type="button" onClick={() => { clearFile(); importTenants.reset() }} aria-label="Remove selected file" className="rounded-full p-1 hover:bg-black/5">
                <FiX size={16} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={chooseFile} className="w-full rounded-xl border-2 border-dashed p-6 text-center hover:bg-(--qms-surface-hover)" style={{ borderColor: 'var(--qms-border)' }}>
              <FiUpload size={20} className="mx-auto mb-1.5" style={{ color: 'var(--qms-text-muted)' }} />
              <p className="text-[13px] font-semibold" style={{ color: 'var(--qms-text)' }}>Choose a CSV file</p>
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            aria-label="Client CSV file"
            onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
          />

          <div className="space-y-1 rounded-xl p-3 text-[11px]" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
            <p><strong style={{ color: 'var(--qms-text)' }}>Required:</strong> name, ownerFirstName, ownerEmail, ownerPassword.</p>
            <p><strong style={{ color: 'var(--qms-text)' }}>Optional:</strong> description, gst, businessLifetime, salesPersonEmail, ownerLastName, ownerPhone, ownerGender.</p>
            <p>If any address field is supplied, addressLine1, city, state and pincode are all required. Optional address fields are addressLine2, locality, country, googlePlaceId, longitude and latitude.</p>
            <p>An unknown salesPersonEmail does not reject the row; the client is created without a sales-person assignment.</p>
          </div>

          {importTenants.isError && (
            <div role="alert" className="rounded-xl border border-danger bg-danger-soft px-3 py-2 text-xs text-danger">
              {getApiErrorMessage(importTenants.error, 'Could not import clients. Please try again.')}
            </div>
          )}

          {result && (
            <div className="space-y-2 rounded-xl px-3 py-2.5 text-[12px]" style={{ background: 'var(--qms-surface-strong)' }}>
              <div className="flex items-center gap-2 font-semibold" style={{ color: 'var(--qms-text)' }}>
                {result.failed === 0 ? <FiCheckCircle className="text-success" /> : <FiAlertTriangle className="text-danger" />}
                <span>{result.created} of {result.totalRows} clients imported</span>
              </div>
              {result.failed > 0 && (
                <p className="text-danger">
                  {result.failed} row{result.failed === 1 ? '' : 's'} failed. Successful rows are already created—fix and upload only the failed rows to avoid duplicates.
                </p>
              )}
              {result.errors.length > 0 && (
                <div className="max-h-36 space-y-1 overflow-y-auto text-danger" aria-label="Import row errors">
                  {result.errors.map((entry, index) => (
                    <p key={`${entry.row}-${index}`}>Row {entry.row}: {formatRowError(entry.error)}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={resetAndClose}>Close</Button>
          <Button type="button" onClick={handleImport} disabled={!file || importTenants.isPending}>
            <FiUpload size={14} /> {importTenants.isPending ? 'Importing…' : 'Import clients'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ImportTenantsDialog
