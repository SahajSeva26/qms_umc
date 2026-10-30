import { FiExternalLink, FiX } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { DialogPortal } from '@/components/ui/dialog'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { usePharmaCamp } from '@/features/camps/hooks/usePharmaCamp'
import CampDossierContent from '@/features/camps/components/dossier/CampDossierContent'
import { campDossierPath } from '@/features/pharma/pharma.constants'

interface CampDossierModalProps {
  campId: string | null
  onClose: () => void
}

// Matches CampDossierContent's real card stack (header + field-grid cards) so the shimmer
// never jumps in size once the GET /camps/:id response arrives.
const DOSSIER_SKELETON = (
  <div aria-busy="true" aria-live="polite" className="animate-pulse">
    <div className="rounded-[14px] border p-3.5 flex items-center gap-3 mb-2.5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
      <div className="rounded-full shrink-0" style={{ background: 'var(--qms-surface-strong)', width: 50, height: 50 }} />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-28 rounded" style={{ background: 'var(--qms-surface-strong)' }} />
        <div className="h-4 w-48 rounded" style={{ background: 'var(--qms-surface-strong)' }} />
        <div className="h-3 w-36 rounded" style={{ background: 'var(--qms-surface-strong)' }} />
      </div>
    </div>
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="rounded-[14px] border p-3.5 mb-2.5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
        <div className="h-3.5 w-32 rounded mb-3" style={{ background: 'var(--qms-surface-strong)' }} />
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
          {Array.from({ length: 2 }).map((_, j) => (
            <div key={j} className="h-8 rounded" style={{ background: 'var(--qms-surface-strong)' }} />
          ))}
        </div>
      </div>
    ))}
  </div>
)

// Uses DialogPrimitive.Backdrop/Popup directly (not shared DialogContent — its fixed centering
// doesn't fit this sheet's custom layout), so focus-trap/Escape still work like every other dialog.
const CampDossierModal = ({ campId, onClose }: CampDossierModalProps) => {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = usePharmaCamp(campId ?? undefined)
  const camp = data?.data

  if (!campId) return null

  return (
    <DialogPrimitive.Root open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogPortal>
        <DialogPrimitive.Backdrop
          className="fixed inset-0 z-50 duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
          style={{ background: 'rgba(15,23,42,.55)' }}
        />
        <DialogPrimitive.Popup
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-6 outline-none"
        >
          <div
            className="w-full rounded-[18px] overflow-hidden"
            style={{ maxWidth: 980, background: 'var(--qms-page-bg, #f7f8fb)', boxShadow: '0 30px 80px rgba(0,0,0,.35)' }}
          >
            <div
              className="sticky top-0 z-10 px-3.5 py-2.5 flex items-center justify-between border-b"
              style={{ background: 'var(--qms-surface-card)', borderColor: 'var(--qms-border)' }}
            >
              <div className="font-extrabold text-[13px]" style={{ color: 'var(--qms-text)' }}>Camp dossier</div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => navigate(campDossierPath(campId))}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-bold"
                  style={{ color: 'var(--qms-text)' }}
                >
                  <FiExternalLink size={14} /> Open page
                </button>
                <DialogPrimitive.Close
                  aria-label="Close"
                  className="inline-flex items-center justify-center rounded-lg w-7 h-7"
                  style={{ color: 'var(--qms-text)' }}
                >
                  <FiX size={16} />
                </DialogPrimitive.Close>
              </div>
            </div>
            <div className="p-3.5">
              <QueryStateBlock
                isLoading={isLoading}
                error={error}
                loadingLabel="Loading camp dossier…"
                errorLabel="Failed to load this camp. Please try again."
                onRetry={refetch}
                loadingSkeleton={DOSSIER_SKELETON}
              >
                {camp && <CampDossierContent camp={camp} />}
              </QueryStateBlock>
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </DialogPrimitive.Root>
  )
}

export default CampDossierModal
