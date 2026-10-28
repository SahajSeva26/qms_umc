import { FiExternalLink, FiX } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogPortal } from '@/components/ui/dialog'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { usePharmaCamp } from '@/features/pharma/hooks/usePharmaCamp'
import CampDossierContent from '@/features/pharma/components/dossier/CampDossierContent'
import { campDossierPath } from '@/features/pharma/pharma.constants'

interface CampDossierModalProps {
  campId: string | null
  onClose: () => void
}

// Clones the prototype's #cd-overlay: a CENTERED modal sheet (not a side drawer) — backdrop
// rgba(15,23,42,.55), 980px sheet, sticky top bar with "Open page" (hard-navigates to the
// standalone route) and Close. Reuses the base-ui Dialog primitive (already a centered overlay)
// rather than SideDrawer, which slides from the right and doesn't match this screen.
const CampDossierModal = ({ campId, onClose }: CampDossierModalProps) => {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = usePharmaCamp(campId ?? undefined)
  const camp = data?.data

  if (!campId) return null

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogPortal>
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-6"
          style={{ background: 'rgba(15,23,42,.55)' }}
          onClick={onClose}
        >
          <div
            className="w-full rounded-[18px] overflow-hidden"
            style={{ maxWidth: 980, background: 'var(--qms-page-bg, #f7f8fb)', boxShadow: '0 30px 80px rgba(0,0,0,.35)' }}
            onClick={(e) => e.stopPropagation()}
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
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="inline-flex items-center justify-center rounded-lg w-7 h-7"
                  style={{ color: 'var(--qms-text)' }}
                >
                  <FiX size={16} />
                </button>
              </div>
            </div>
            <div className="p-3.5">
              <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading camp dossier…" errorLabel="Failed to load this camp. Please try again." onRetry={refetch}>
                {camp && <CampDossierContent camp={camp} />}
              </QueryStateBlock>
            </div>
          </div>
        </div>
      </DialogPortal>
    </Dialog>
  )
}

export default CampDossierModal
