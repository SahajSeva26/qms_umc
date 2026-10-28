import { useParams, Link, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiChevronRight, FiHome } from 'react-icons/fi'
import { Button } from '@qms/ui'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { usePharmaCamp } from '@/features/pharma/hooks/usePharmaCamp'
import CampDossierContent from '@/features/pharma/components/dossier/CampDossierContent'
import { PHARMA_ROUTES } from '@/features/pharma/pharma.constants'

// Standalone deep-link target for the dossier modal's "Open page" button — same content, page chrome instead of a modal.
const CampDossierPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = usePharmaCamp(id)
  const camp = data?.data

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <div className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
            <FiHome size={13} />
            <Link to={PHARMA_ROUTES.PHARMA_MR} className="hover:underline">Camps</Link>
            <FiChevronRight size={12} />
            <span>{camp?.code ?? id}</span>
          </div>
          <h1 className="text-[22px] font-extrabold tracking-[-0.01em] mt-1" style={{ color: 'var(--qms-text)' }}>Camp dossier</h1>
          <div className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
            Full view · pulled from masters, operations and field data
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate(PHARMA_ROUTES.PHARMA_MR)}>
          <FiArrowLeft size={14} /> Back to camps
        </Button>
      </div>

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading camp dossier…" errorLabel="Failed to load this camp. Please try again." onRetry={refetch}>
        {camp && <CampDossierContent camp={camp} />}
      </QueryStateBlock>
    </div>
  )
}

export default CampDossierPage
