import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiPlus } from 'react-icons/fi'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import AnyPharmaRoleGate from '@/features/pharma/components/AnyPharmaRoleGate'
import { usePharmaProject } from '@/features/pharma/hooks/usePharmaProject'
import { usePharmaCamps, pharmaCampKeys } from '@/features/pharma/hooks/usePharmaCamps'
import { PHARMA_ROUTES } from '@/features/pharma/pharma.routes'
import PharmaCampTable from '@/features/pharma/components/PharmaCampTable'
import BookCampForm from '@/features/pharma/components/BookCampForm'
import ProjectStatusPill from '@/features/projects/components/ProjectStatusPill'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import PaginationControls from '@/components/ui/PaginationControls'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { usePagination } from '@/hooks/usePagination'
import { useSession } from '@/hooks/useSession'

const PAGE_SIZE = 10

// Back button navigates to an explicit route, not navigate(-1) — a direct
// deep link may have no real "back" history entry to return to.
const ROLE_TYPE_TO_ROUTE: Record<string, string> = {
  'pharma-division-head': PHARMA_ROUTES.PHARMA_HO,
  'pharma-rsm': PHARMA_ROUTES.PHARMA_RSM,
  'pharma-asm': PHARMA_ROUTES.PHARMA_ASM,
  'pharma-mr': PHARMA_ROUTES.PHARMA_MR,
}

// Must wrap a separate content component, never sit beside the data hooks
// gated by an early return — React fires every hook's request on every render regardless.
const PharmaProjectCampsPage = () => (
  <AnyPharmaRoleGate>
    <PharmaProjectCampsContent />
  </AnyPharmaRoleGate>
)

const PharmaProjectCampsContent = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { session } = useSession()
  const [bookOpen, setBookOpen] = useState(false)
  const { page, setPage, totalPages } = usePagination(PAGE_SIZE)

  const { data: projectData, isLoading: projectLoading, error: projectError } = usePharmaProject(id)
  const project = projectData?.data ?? null

  // Waits on the RESOLVED project object, not just a truthy id param — an
  // inaccessible/404'd project must never trigger a redundant camps request.
  const { data: campsData, isLoading: campsLoading, error: campsError, refetch: refetchCamps } = usePharmaCamps(
    { project: project?.id, page: String(page), limit: String(PAGE_SIZE) },
    { enabled: !!project },
  )
  const camps = campsData?.data?.items ?? []
  const totalCamps = campsData?.data?.count ?? 0

  // Only HO/RSM/ASM book on behalf of a downline MR — derived directly from
  // the session here, not threaded down as a prop through two route levels.
  const needsMrPicker = session?.roleType.code !== 'pharma-mr'
  const backRoute = session ? (ROLE_TYPE_TO_ROUTE[session.roleType.code] ?? PHARMA_ROUTES.PHARMA) : PHARMA_ROUTES.PHARMA
  // Division-head's camp scoping is division-wide, not assignment-scoped —
  // unlike RSM/ASM/MR, an empty list for them genuinely means no camps yet.
  const isDivisionHead = session?.roleType.code === 'pharma-division-head'
  const emptyCampsText = isDivisionHead
    ? 'No camps have been booked for this project yet.'
    : 'No camps assigned to you on this project yet.'

  const handleBooked = () => {
    setBookOpen(false)
    queryClient.invalidateQueries({ queryKey: pharmaCampKeys.list({ project: project?.id, page: String(page), limit: String(PAGE_SIZE) }) })
    toast.success('Camp requested')
  }

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
            className="rounded-xl border p-5 mb-5 flex items-start justify-between gap-3"
            style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
          >
            <div className="min-w-0">
              <div className="text-lg font-bold truncate" style={{ color: 'var(--qms-text)' }}>{project.name}</div>
              <div className="text-[13px] truncate mb-2" style={{ color: 'var(--qms-text-muted)' }}>{project.code}</div>
              <ProjectStatusPill status={project.status} />
            </div>
            <Button
              onClick={() => setBookOpen(true)}
              className="text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
            >
              <FiPlus size={14} /> New camp
            </Button>
          </div>

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

          <Dialog open={bookOpen} onOpenChange={setBookOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>New camp</DialogTitle>
                <DialogDescription>Book a camp against {project.name}.</DialogDescription>
              </DialogHeader>
              <BookCampForm
                needsMrPicker={needsMrPicker}
                project={{ id: project.id, name: project.name }}
                onBooked={handleBooked}
              />
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}

export default PharmaProjectCampsPage
