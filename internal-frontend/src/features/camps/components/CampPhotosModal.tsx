import { useRef, useState } from 'react'
import { FiCamera, FiCheck, FiRefreshCw, FiTrash2, FiX } from 'react-icons/fi'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useCampFiles } from '@/features/camps/hooks/useCampFiles'
import { useCampFileUpload, type CampFileTileState } from '@/features/camps/hooks/useCampFileUpload'
import { useDiscardCampFile } from '@/features/camps/hooks/useDiscardCampFile'
import type { CampFileRelation } from '@/types/campReal.types'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const ctaStyle = (variant: 'ghost' | 'primary', disabled = false): React.CSSProperties => ({
  padding: '8px 12px',
  borderRadius: 10,
  border: variant === 'ghost' ? '1px solid var(--qms-border)' : 'none',
  font: '800 12px Inter, sans-serif',
  cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'inline-flex',
  gap: 6,
  alignItems: 'center',
  background: variant === 'primary' ? 'linear-gradient(135deg, #14b8a6, #0ea5e9)' : 'var(--qms-surface)',
  color: variant === 'primary' ? '#fff' : 'var(--qms-text)',
  boxShadow: variant === 'primary' ? '0 4px 14px rgba(20,184,166,.32)' : undefined,
  opacity: disabled ? 0.5 : 1,
})

export interface CampPhotoRelationConfig {
  relation: CampFileRelation
  label: string
  cap: number
}

interface CampPhotosModalProps {
  open: boolean
  onClose: () => void
  campId: string
  relations: CampPhotoRelationConfig[]
  // Per-relation — true if uploadable, or a human-readable reason why not (shown in the empty state).
  canUploadFor: (relation: CampFileRelation) => true | string
}

// Master-detail gallery: one large preview (real evidence photo, not a tiny tile) + a thumbnail
// strip below. A real file picker feeds the real presigned-S3 upload/discard lifecycle.
const CampPhotosModal = ({ open, onClose, campId, relations, canUploadFor }: CampPhotosModalProps) => {
  const [activeRelation, setActiveRelation] = useState(relations[0]?.relation)
  const active = relations.find((r) => r.relation === activeRelation) ?? relations[0]

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      {/* Inline style, not a sm:max-w-* class — Tailwind's generated-CSS order means a plain
          utility class can lose to the primitive's own sm:max-w-sm; inline style always wins. */}
      <DialogContent className="max-h-[calc(100dvh-2rem)] flex flex-col" style={{ maxWidth: 'min(calc(100% - 2rem), 1024px)' }}>
        <DialogHeader>
          <DialogTitle>Camp photos</DialogTitle>
          <p className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Capture to validate — stored with the camp record.</p>
        </DialogHeader>

        <div className="flex gap-1.5 mb-3">
          {relations.map((r) => (
            <button
              key={r.relation}
              type="button"
              onClick={() => setActiveRelation(r.relation)}
              className="px-3 py-1.5 rounded-full text-[12px] font-bold transition-colors"
              style={
                active?.relation === r.relation
                  ? { background: 'var(--qms-brand)', color: '#fff' }
                  : { background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }
              }
            >
              {r.label}
            </button>
          ))}
        </div>

        {active && (() => {
          const uploadState = canUploadFor(active.relation)
          return (
            <CampPhotosPanel
              key={active.relation}
              campId={campId}
              relation={active.relation}
              label={active.label}
              cap={active.cap}
              canUpload={uploadState === true}
              cannotUploadReason={uploadState === true ? null : uploadState}
              onClose={onClose}
            />
          )
        })()}
      </DialogContent>
    </Dialog>
  )
}

interface CampPhotosPanelProps {
  campId: string
  relation: CampFileRelation
  label: string
  cap: number
  canUpload: boolean
  cannotUploadReason: string | null
  onClose: () => void
}

// Thumbnail strip caps display at 5, independent of the relation's own cap (setup allows 5
// anyway; this is a UI display bound, not a business rule).
const THUMB_STRIP_LIMIT = 5

type GalleryItem =
  | { kind: 'file'; id: string; url?: string }
  | { kind: 'pending'; key: string; tile: CampFileTileState }

const CampPhotosPanel = ({ campId, relation, label, cap, canUpload, cannotUploadReason, onClose }: CampPhotosPanelProps) => {
  const { files, isLoading, isError, refetch } = useCampFiles(campId, relation)
  const { tiles, uploadFiles, retryTile, dismissTile } = useCampFileUpload(campId, relation, { onSuccess: refetch })
  const discardFile = useDiscardCampFile(campId, relation)
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const pendingEntries = Object.entries(tiles)
  const pendingCount = pendingEntries.filter(([, t]) => t.step !== 'create-failed').length
  const doneCount = files.length
  const atCap = doneCount + pendingCount >= cap

  const items: GalleryItem[] = [
    ...files.map((f) => ({ kind: 'file' as const, id: f.id, url: f.url ?? undefined })),
    ...pendingEntries.map(([key, tile]) => ({ kind: 'pending' as const, key, tile })),
  ].slice(0, THUMB_STRIP_LIMIT)

  // Derived selection — falls back to the first real file once loaded if nothing is explicitly
  // selected, or the explicit selection no longer exists (e.g. it was just removed).
  const explicitSelection = selectedId ? files.find((f) => f.id === selectedId) : undefined
  const selectedFile = explicitSelection ?? files[0] ?? null

  const openPicker = () => {
    if (inputRef.current) inputRef.current.value = ''
    inputRef.current?.click()
  }

  const handlePicked = (picked: FileList | null) => {
    if (!picked || picked.length === 0) return
    const remaining = Math.max(0, cap - doneCount - pendingCount)
    uploadFiles(Array.from(picked).slice(0, remaining))
  }

  const handleRemove = (fileId: string) => {
    if (!window.confirm('Remove this photo? This cannot be undone.')) return
    discardFile.mutate(fileId, {
      onSuccess: () => {
        if (selectedId === fileId) setSelectedId(null)
      },
    })
  }

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-extrabold text-[13px]" style={{ color: 'var(--qms-text)' }}>{label} photo · {doneCount}/{cap}</span>
        <span className="text-[11px] font-extrabold" style={{ color: doneCount >= cap ? 'var(--success)' : 'var(--warning)' }}>
          {doneCount >= cap ? '✓ CAPTURED' : 'PENDING'}
        </span>
      </div>

      {isError ? (
        <div className="flex items-center justify-between gap-3 text-[12px] rounded-lg px-2.5 py-1.5 bg-danger-soft border border-danger text-danger">
          <span>Couldn't load {label.toLowerCase()} photos.</span>
          <button onClick={() => refetch()} className="shrink-0 underline font-semibold">Retry</button>
        </div>
      ) : (
        <>
          {/* Fixed, screen-responsive height (not image-driven) keeps the dialog's total content
              height predictable; object-contain fits the whole image inside it, never cropped. */}
          <div
            className="relative rounded-xl overflow-hidden flex items-center justify-center shrink-0"
            style={{ background: '#0b0f19', height: 'clamp(200px, 38vh, 420px)' }}
          >
            {isLoading ? (
              <span className="text-[12px]" style={{ color: '#94a3b8' }}>…</span>
            ) : selectedFile ? (
              <>
                {selectedFile.url ? (
                  <img src={selectedFile.url} alt={`${label} photo`} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-[12px]" style={{ color: '#94a3b8' }}>No preview</span>
                )}
                {canUpload && (
                  <button
                    type="button"
                    onClick={() => handleRemove(selectedFile.id)}
                    disabled={discardFile.isPending && discardFile.variables === selectedFile.id}
                    className="absolute bottom-2 right-2 flex items-center gap-1.5 text-[11px] font-extrabold text-white px-2.5 py-1.5 rounded-full"
                    style={{ background: 'rgba(15,23,42,.85)' }}
                  >
                    <FiTrash2 size={12} /> {discardFile.isPending && discardFile.variables === selectedFile.id ? 'Removing…' : 'Remove photo'}
                  </button>
                )}
              </>
            ) : canUpload && !atCap ? (
              <button type="button" onClick={openPicker} className="flex flex-col items-center gap-2">
                <FiCamera size={28} style={{ color: '#94a3b8' }} />
                <span className="text-[12px] font-bold" style={{ color: '#cbd5e1' }}>Capture photo</span>
              </button>
            ) : cannotUploadReason ? (
              <span className="text-[12px] text-center px-6" style={{ color: '#94a3b8' }}>{cannotUploadReason}</span>
            ) : (
              <span className="text-[12px]" style={{ color: '#94a3b8' }}>No photo captured yet</span>
            )}
          </div>

          {discardFile.isError && discardFile.variables === selectedFile?.id && (
            <div className="flex items-center justify-between gap-3 text-[12px] rounded-lg px-2.5 py-1.5 mt-2 bg-danger-soft border border-danger text-danger">
              <span>Couldn't remove this photo.</span>
              <button onClick={() => discardFile.mutate(discardFile.variables!)} className="shrink-0 underline font-semibold">Retry</button>
            </div>
          )}

          {/* Thumbnail strip — selecting a thumbnail changes the large preview above. */}
          {!isLoading && items.length > 0 && (
            <div className="flex gap-3 mt-2.5">
              {items.map((item) =>
                item.kind === 'file' ? (
                  <ThumbTile
                    key={item.id}
                    url={item.url}
                    selected={item.id === selectedFile?.id}
                    onClick={() => setSelectedId(item.id)}
                  />
                ) : (
                  <ThumbTileInFlight
                    key={item.key}
                    tile={item.tile}
                    onRetry={() => void retryTile(item.key)}
                    onDismiss={() => dismissTile(item.key)}
                  />
                ),
              )}
            </div>
          )}
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handlePicked(e.target.files)}
      />

      <div className="flex justify-end gap-1.5 mt-3 shrink-0">
        <button type="button" onClick={onClose} style={ctaStyle('ghost')}>Close</button>
        {canUpload && !atCap && doneCount > 0 && (
          <button type="button" onClick={openPicker} style={ctaStyle('primary')}>
            <FiCheck size={13} /> Add another
          </button>
        )}
      </div>
    </div>
  )
}

const ThumbTile = ({ url, selected, onClick }: { url?: string; selected: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    aria-label="Select photo"
    className="relative shrink-0 rounded-lg overflow-hidden grid place-items-center"
    style={{
      width: 68,
      height: 68,
      background: '#000',
      // Inset box-shadow, not outline — outline's offset draws outside the box, which clips the
      // first tile's left edge against the strip's own boundary.
      boxShadow: selected ? 'inset 0 0 0 2px var(--qms-brand)' : 'inset 0 0 0 2px transparent',
    }}
  >
    {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : <span className="text-[9px]" style={{ color: '#94a3b8' }}>—</span>}
  </button>
)

const ThumbTileInFlight = ({ tile, onRetry, onDismiss }: { tile: CampFileTileState; onRetry: () => void; onDismiss: () => void }) => {
  const isFailed = tile.step === 'create-failed' || tile.step === 'upload-failed' || tile.step === 'activate-failed' || tile.step === 'refresh-failed'
  // refresh-failed is the one failure where the upload is already saved — dismissing just stops
  // local tracking of it, it doesn't discard anything server-side.
  const dismissLabel = tile.step === 'refresh-failed' ? 'Hide (already saved)' : 'Dismiss'
  return (
    <div
      className="relative shrink-0 rounded-lg grid place-items-center gap-0.5 text-center p-1"
      style={{ width: 68, height: 68, background: '#000', border: isFailed ? '1px solid var(--danger)' : undefined }}
    >
      {isFailed ? (
        <>
          <button onClick={onRetry} aria-label="Retry" className="text-white">
            <FiRefreshCw size={13} />
          </button>
          <button onClick={onDismiss} aria-label={dismissLabel} className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full grid place-items-center" style={{ background: '#1f2937' }}>
            <FiX size={9} style={{ color: '#fff' }} />
          </button>
        </>
      ) : (
        <span className="text-[9px]" style={{ color: '#94a3b8' }}>
          {tile.step === 'creating' && 'Start…'}
          {tile.step === 'uploading' && 'Upload…'}
          {tile.step === 'activating' && 'Confirm…'}
          {tile.step === 'refreshing' && 'Saving…'}
        </span>
      )}
    </div>
  )
}

export default CampPhotosModal
