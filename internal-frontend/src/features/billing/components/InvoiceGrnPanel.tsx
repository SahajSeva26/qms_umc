import { useRef } from 'react'
import { FiFile, FiRefreshCw, FiTrash2, FiUpload, FiX } from 'react-icons/fi'
import { useInvoiceFiles } from '@/features/billing/hooks/useInvoiceFiles'
import { useInvoiceFileUpload, type InvoiceFileTileState } from '@/features/billing/hooks/useInvoiceFileUpload'
import { useDiscardInvoiceFile } from '@/features/billing/hooks/useDiscardInvoiceFile'
import { getApiErrorMessage } from '@/utils/apiError'

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const CAP = 1

interface InvoiceGrnPanelProps {
  invoiceId: string
  canUpload: boolean
}

// The signed GRN document — single-file cap (relation 'grn', see backend INVOICE_FILE_CONFIG),
// uploadable while the invoice is issued/grn_signed. Mirrors CampPhotosModal's upload lifecycle
// (create -> S3 PUT -> activate -> refresh) scoped to one document instead of a photo gallery.
const InvoiceGrnPanel = ({ invoiceId, canUpload }: InvoiceGrnPanelProps) => {
  const { files, isLoading, isError, refetch } = useInvoiceFiles(invoiceId, 'grn')
  const { tiles, uploadFiles, retryTile, dismissTile } = useInvoiceFileUpload(invoiceId, 'grn', { onSuccess: refetch })
  const discardFile = useDiscardInvoiceFile(invoiceId, 'grn')
  const inputRef = useRef<HTMLInputElement>(null)

  const pendingEntries = Object.entries(tiles)
  const pendingCount = pendingEntries.filter(([, t]) => t.step !== 'create-failed').length
  const doneFile = files[0] ?? null
  const atCap = (doneFile ? 1 : 0) + pendingCount >= CAP

  const openPicker = () => {
    if (inputRef.current) inputRef.current.value = ''
    inputRef.current?.click()
  }

  const handlePicked = (picked: FileList | null) => {
    if (!picked || picked.length === 0 || atCap) return
    uploadFiles([picked[0]])
  }

  const handleRemove = () => {
    if (!doneFile) return
    if (!window.confirm('Remove the GRN document? This cannot be undone.')) return
    discardFile.mutate(doneFile.id)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--qms-text-muted)' }}>GRN document</div>
        {canUpload && !atCap && (
          <button type="button" onClick={openPicker} className="text-[11px] font-bold inline-flex items-center gap-1" style={{ color: 'var(--qms-brand)' }}>
            <FiUpload size={11} /> Upload
          </button>
        )}
      </div>

      {isError ? (
        <div className="flex items-center justify-between gap-3 text-[12px] rounded-lg px-2.5 py-1.5 bg-danger-soft border border-danger text-danger">
          <span>Couldn't load the GRN document.</span>
          <button onClick={() => refetch()} className="shrink-0 underline font-semibold">Retry</button>
        </div>
      ) : isLoading ? (
        <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Loading…</p>
      ) : (
        <>
          {doneFile && (
            <div className="flex items-center justify-between gap-2 py-1.5" style={{ borderBottom: '1px solid var(--qms-border)' }}>
              <a
                href={doneFile.url ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-[13px] font-semibold truncate"
                style={{ color: 'var(--qms-text)' }}
              >
                <FiFile size={13} className="shrink-0" />
                <span className="truncate">{doneFile.content?.displayName ?? doneFile.content?.originalName ?? 'GRN document'}</span>
              </a>
              {canUpload && (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={discardFile.isPending && discardFile.variables === doneFile.id}
                  className="shrink-0 text-[11px] font-bold inline-flex items-center gap-1"
                  style={{ color: 'var(--qms-danger, #ef4444)' }}
                >
                  <FiTrash2 size={11} /> {discardFile.isPending && discardFile.variables === doneFile.id ? 'Removing…' : 'Remove'}
                </button>
              )}
            </div>
          )}

          {discardFile.isError && discardFile.variables === doneFile?.id && (
            <div className="flex items-center justify-between gap-3 text-[12px] rounded-lg px-2.5 py-1.5 mt-1.5 bg-danger-soft border border-danger text-danger">
              <span>Couldn't remove this document.</span>
              <button onClick={() => discardFile.mutate(discardFile.variables!)} className="shrink-0 underline font-semibold">Retry</button>
            </div>
          )}

          {pendingEntries.map(([key, tile]) => (
            <PendingTileRow key={key} tile={tile} onRetry={() => void retryTile(key)} onDismiss={() => dismissTile(key)} />
          ))}

          {!doneFile && pendingEntries.length === 0 && (
            <p className="text-[12px] py-1" style={{ color: 'var(--qms-text-muted)' }}>
              {canUpload ? 'No GRN document uploaded yet.' : 'No GRN document.'}
            </p>
          )}
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={(e) => handlePicked(e.target.files)}
      />
    </div>
  )
}

// Each failed step carries the real axios/API error from the backend (e.g. "'grn' files can only
// be uploaded while the invoice is issued or grn_signed") — surfaced verbatim via
// getApiErrorMessage, with a generic step label only as the fallback when the backend gave no
// usable message (e.g. a network-level failure with no response body).
const STEP_FALLBACK: Partial<Record<InvoiceFileTileState['step'], string>> = {
  'create-failed': 'Couldn’t start upload.',
  'upload-failed': 'Upload failed.',
  'activate-failed': 'Couldn’t confirm upload.',
  'refresh-failed': 'Saved, but couldn’t refresh the view.',
}

const PendingTileRow = ({ tile, onRetry, onDismiss }: { tile: InvoiceFileTileState; onRetry: () => void; onDismiss: () => void }) => {
  const isFailed = tile.step === 'create-failed' || tile.step === 'upload-failed' || tile.step === 'activate-failed' || tile.step === 'refresh-failed'
  const dismissLabel = tile.step === 'refresh-failed' ? 'Hide (already saved)' : 'Dismiss'
  const message = isFailed
    ? getApiErrorMessage(tile.error, STEP_FALLBACK[tile.step] ?? 'Something went wrong.')
    : null

  return (
    <div className="flex items-center justify-between gap-2 py-1.5 text-[12px]" style={{ color: isFailed ? 'var(--qms-danger, #ef4444)' : 'var(--qms-text-muted)' }}>
      <span>
        {tile.step === 'creating' && 'Starting upload…'}
        {tile.step === 'uploading' && 'Uploading…'}
        {tile.step === 'activating' && 'Confirming…'}
        {tile.step === 'refreshing' && 'Saving…'}
        {message}
      </span>
      {isFailed && (
        <span className="flex items-center gap-2 shrink-0">
          <button onClick={onRetry} aria-label="Retry" className="inline-flex items-center gap-1 font-bold underline">
            <FiRefreshCw size={10} /> Retry
          </button>
          <button onClick={onDismiss} aria-label={dismissLabel} className="inline-flex items-center">
            <FiX size={12} />
          </button>
        </span>
      )}
    </div>
  )
}

export default InvoiceGrnPanel
