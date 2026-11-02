import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useCampFiles } from '@/features/camps/hooks/useCampFiles'
import type { CampFileRelation } from '@/types/campReal.types'

const RELATIONS: { relation: CampFileRelation; label: string }[] = [
  { relation: 'setup', label: 'Setup' },
  { relation: 'check-in-selfie', label: 'Check-in selfie' },
  { relation: 'closure', label: 'Closure' },
]

// Read-only — an MR can view but never upload/remove camp photos (POST/DELETE are FO/dietitian-
// only server-side). No capture button, no file picker, no discard action anywhere in this view.
export function CampPhotosViewer({ campId }: { campId: string }) {
  const [openUrl, setOpenUrl] = useState<string | null>(null)
  const setup = useCampFiles(campId, 'setup')
  const selfie = useCampFiles(campId, 'check-in-selfie')
  const closure = useCampFiles(campId, 'closure')
  const byRelation = { setup, 'check-in-selfie': selfie, closure }

  const isLoading = setup.isLoading || selfie.isLoading || closure.isLoading
  const hasAnyError = setup.isError || selfie.isError || closure.isError
  const hasAnyPhotos = setup.files.length > 0 || selfie.files.length > 0 || closure.files.length > 0

  if (isLoading) {
    return <div className="text-[12px] italic text-center py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Loading photos…</div>
  }

  if (!hasAnyPhotos && !hasAnyError) {
    return <div className="text-[12px] italic text-center py-2.5" style={{ color: 'var(--qms-text-muted)' }}>No photos uploaded yet.</div>
  }

  return (
    <div className="space-y-3">
      {RELATIONS.map((r) => {
        const { files, isError, refetch } = byRelation[r.relation]
        if (isError) {
          return (
            <div key={r.relation} className="flex items-center justify-between gap-3 text-[12px] rounded-lg px-2.5 py-1.5 bg-danger-soft border border-danger text-danger">
              <span>Couldn't load {r.label.toLowerCase()} photos.</span>
              <button onClick={() => refetch()} className="shrink-0 underline font-semibold">Retry</button>
            </div>
          )
        }
        if (files.length === 0) return null
        return (
          <div key={r.relation}>
            <div className="text-[10.5px] font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>{r.label}</div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {files.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => f.url && setOpenUrl(f.url)}
                  disabled={!f.url}
                  className="relative shrink-0 rounded-lg overflow-hidden grid place-items-center"
                  style={{ width: 64, height: 64, background: '#000' }}
                >
                  {f.url && <img src={f.url} alt={`${r.label} photo`} className="w-full h-full object-cover" />}
                </button>
              ))}
            </div>
          </div>
        )
      })}

      <Dialog open={!!openUrl} onOpenChange={(next) => !next && setOpenUrl(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] flex flex-col" style={{ maxWidth: 'min(calc(100% - 2rem), 720px)' }}>
          <DialogHeader>
            <DialogTitle>Camp photo</DialogTitle>
          </DialogHeader>
          {openUrl && (
            <div className="rounded-xl overflow-hidden flex items-center justify-center" style={{ background: '#0b0f19', height: 'clamp(240px, 50vh, 480px)' }}>
              <img src={openUrl} alt="Camp photo" className="w-full h-full object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
