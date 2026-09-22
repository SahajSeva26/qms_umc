import { useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import AnyPharmaRoleGate from '@/features/pharma/components/AnyPharmaRoleGate'
import { usePharmaProject } from '@/features/pharma/hooks/usePharmaProject'
import { usePharmaCamps } from '@/features/pharma/hooks/usePharmaCamps'
import { PHARMA_ROUTES, getPharmaRoleMeta } from '@/features/pharma/pharma.constants'
import PharmaCampTable from '@/features/pharma/components/PharmaCampTable'
import PharmaCampsNav from '@/features/pharma/components/PharmaCampsNav'
import ProjectStatusPill from '@/features/projects/components/ProjectStatusPill'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import PaginationControls from '@/components/ui/PaginationControls'
import { usePagination } from '@/hooks/usePagination'
import { useSession } from '@/hooks/useSession'

const PAGE_SIZE = 10

// Separate content component so a rejected role never mounts usePharmaProject/usePharmaCamps.
const PharmaProjectCampsPage = () => (
  <AnyPharmaRoleGate>
    <PharmaProjectCampsContent />
  </AnyPharmaRoleGate>
)

// The unrestricted "All camps" view — every type incl. Lab, view-only; booking happens on Screening/Diet.
const PharmaProjectCampsContent = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { session } = useSession()
  const { page, setPage, totalPages } = usePagination(PAGE_SIZE)

  const { data: projectData, isLoading: projectLoading, error: projectError } = usePharmaProject(id)
  const project = projectData?.data ?? null

  // Waits on the resolved project, not just the id — an inaccessible project must never fetch camps.
  const { data: campsData, isLoading: campsLoading, error: campsError, refetch: refetchCamps } = usePharmaCamps(
    { project: project?.id, page: String(page), limit: String(PAGE_SIZE) },
    { enabled: !!project },
  )
  const camps = campsData?.data?.items ?? []
  const totalCamps = campsData?.data?.count ?? 0

  const backRoute = getPharmaRoleMeta(session?.roleType?.code)?.portalPath ?? PHARMA_ROUTES.PHARMA
  // Division-head scoping is division-wide, not assignment-scoped like RSM/ASM/MR.
  const isDivisionHead = session?.roleType?.code === 'pharma-division-head'
  const emptyCampsText = isDivisionHead
    ? 'No camps have been booked for this project yet.'
    : 'No camps assigned to you on this project yet.'

  return (
    <div className="w-full">
      <button
        onClick={() => navigate(backRoute)}
        className="flex items-center gap-1.5 text-[13px] font-semibold mb-5 transition-colors hover:opacity-80"
        style={{ color: 'var(--qms-text-soft)' }}
      >
        <FiArrowLeft size={14} />
        Back to projects
      </button>

      {projectLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading project…
        </div>
      )}

      {projectError && !projectLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Project not found, or you don't have access to it.
        </div>
      )}

      {project && !projectLoading && (
        <>
          <div
            className="rounded-xl border p-5 mb-5"
            style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
          >
            <div className="min-w-0">
              <div className="text-lg font-bold truncate" style={{ color: 'var(--qms-text)' }}>{project.name}</div>
              <div className="text-[13px] truncate mb-2" style={{ color: 'var(--qms-text-muted)' }}>{project.code}</div>
              <ProjectStatusPill status={project.status} />
            </div>
          </div>

          <h1 className="text-base font-bold mb-2" style={{ color: 'var(--qms-text)' }}>All camps</h1>
          <PharmaCampsNav project={project} active="all" />

          <QueryStateBlock
            isLoading={campsLoading}
            error={campsError}
            loadingLabel="Loading camps…"
            errorLabel="Failed to load camps. Please try again."
            onRetry={refetchCamps}
          >
            {camps.length === 0 ? (
              <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
                {emptyCampsText}
              </div>
            ) : (
              <PharmaCampTable camps={camps} />
            )}
            <PaginationControls page={page} totalPages={totalPages(totalCamps)} onPageChange={setPage} />
          </QueryStateBlock>
        </>
      )}
    </div>
  )
}

export default PharmaProjectCampsPage
