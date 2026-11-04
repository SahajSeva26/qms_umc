import { useParams, Link, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiChevronRight, FiHome } from 'react-icons/fi'
import { Button } from '@qms/ui'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { usePharmaCamp } from '@/features/camps/hooks/usePharmaCamp'
import CampDossierContent from '@/features/camps/components/dossier/CampDossierContent'
import { getPharmaRoleMeta, PHARMA_ROUTES } from '@/features/pharma/pharma.constants'
import { useSession } from '@/hooks/useSession'

// Standalone deep-link target for the dossier modal's "Open page" button — same content, page
// chrome instead of a modal. The return path is derived from the viewing session's OWN role
// (getPharmaRoleMeta), not hardcoded to MR — an HO/RSM/ASM opening a valid dossier URL (e.g. from
// a bookmark, a shared link, or a notification) returns to their own portal, not MR's.
const CampDossierPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { session } = useSession()
  const { data, isLoading, error, refetch } = usePharmaCamp(id)
  const camp = data?.data
  // Falls back to the MR portal only if the viewer's role can't be resolved yet (session still
  // settling) — never silently sends a resolved non-MR role to MR's portal.
  const backPath = getPharmaRoleMeta(session?.roleType?.code)?.portalPath ?? PHARMA_ROUTES.PHARMA_MR

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <div className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
            <FiHome size={13} />
            <Link to={backPath} className="hover:underline">Camps</Link>
            <FiChevronRight size={12} />
            <span>{camp?.code ?? id}</span>
          </div>
          <h1 className="text-[22px] font-extrabold tracking-[-0.01em] mt-1" style={{ color: 'var(--qms-text)' }}>Camp dossier</h1>
          <div className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
            Full view · pulled from masters, operations and field data
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate(backPath)}>
          <FiArrowLeft size={14} /> Back to portal
        </Button>
      </div>

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading camp dossier…" errorLabel="Failed to load this camp. Please try again." onRetry={refetch}>
        {camp && <CampDossierContent camp={camp} />}
      </QueryStateBlock>
    </div>
  )
}

export default CampDossierPage
