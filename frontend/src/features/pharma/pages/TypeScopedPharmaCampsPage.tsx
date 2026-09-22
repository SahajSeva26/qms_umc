import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiPlus } from 'react-icons/fi'
import { toast } from 'sonner'
import AnyPharmaRoleGate from '@/features/pharma/components/AnyPharmaRoleGate'
import { usePharmaProject } from '@/features/pharma/hooks/usePharmaProject'
import { usePharmaCamps } from '@/features/pharma/hooks/usePharmaCamps'
import { PHARMA_ROUTES, getPharmaRoleMeta } from '@/features/pharma/pharma.constants'
import PharmaCampTable from '@/features/pharma/components/PharmaCampTable'
import PharmaCampsNav from '@/features/pharma/components/PharmaCampsNav'
import BookCampForm from '@/features/pharma/components/BookCampForm'
import ProjectStatusPill from '@/features/projects/components/ProjectStatusPill'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import PaginationControls from '@/components/ui/PaginationControls'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { usePagination } from '@/hooks/usePagination'
import { useSession } from '@/hooks/useSession'
import { allowedCampTypesForProjectTypes, type WhoCanBookCampCode } from '@/types/project.types'
import { CAMP_TYPE_LABEL } from '@/types/campReal.types'

const PAGE_SIZE = 10

interface TypeScopedPharmaCampsPageProps {
  // Lab has no dedicated route — reachable only via "All camps" (see TODO.md).
  type: 'screening' | 'diet'
  title: string
}

// Viewing is never restricted by the project's own `type` — only booking is
// (a Diet camp on a Screening-only project must still show up here).
const TypeScopedPharmaCampsPage = ({ type, title }: TypeScopedPharmaCampsPageProps) => (
  <AnyPharmaRoleGate>
    <TypeScopedPharmaCampsContent type={type} title={title} />
  </AnyPharmaRoleGate>
)

const TypeScopedPharmaCampsContent = ({ type, title }: TypeScopedPharmaCampsPageProps) => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { session } = useSession()
  const [bookOpen, setBookOpen] = useState(false)
  const { page, setPage, totalPages } = usePagination(PAGE_SIZE)

  const { data: projectData, isLoading: projectLoading, error: projectError } = usePharmaProject(id)
  const project = projectData?.data ?? null

  // Waits on the resolved project, not just the id — an inaccessible project must never fetch camps.
  const { data: campsData, isLoading: campsLoading, error: campsError, refetch: refetchCamps } = usePharmaCamps(
    { project: project?.id, type, page: String(page), limit: String(PAGE_SIZE) },
    { enabled: !!project },
  )
  const camps = campsData?.data?.items ?? []
  const totalCamps = campsData?.data?.count ?? 0

  // Only HO/RSM/ASM book on behalf of a downline MR.
  const needsMrPicker = session?.roleType?.code !== 'pharma-mr'
  // preferType keeps "Your projects" on the same camp category for the next pick (see pharmaCamps.routing.ts).
  const backRoute = `${getPharmaRoleMeta(session?.roleType?.code)?.portalPath ?? PHARMA_ROUTES.PHARMA}?preferType=${type}`
  // Division-head scoping is division-wide, not assignment-scoped like RSM/ASM/MR.
  const isDivisionHead = session?.roleType?.code === 'pharma-division-head'
  const typeLabel = CAMP_TYPE_LABEL[type]
  const emptyCampsText = isDivisionHead
    ? `No ${typeLabel.toLowerCase()} camps have been booked for this project yet.`
    : `No ${typeLabel.toLowerCase()} camps assigned to you on this project yet.`

  // Gates booking only — never hides existing camps of this type (see the props comment above).
  const projectAllowsThisType = project ? allowedCampTypesForProjectTypes(project.type).includes(type) : false
  const roleCanBook = !project || project.whoCanBookCamp.length === 0 || project.whoCanBookCamp.includes((session?.roleType?.code ?? '') as WhoCanBookCampCode)
  const hasSlots = !!project && project.campTimeSlots.length > 0
  const canBook = roleCanBook && hasSlots && projectAllowsThisType
  const cannotBookReason = !projectAllowsThisType
    ? `This project isn't configured for ${typeLabel.toLowerCase()} camps.`
    : !roleCanBook
      ? 'Your role cannot book camps on this project.'
      : !hasSlots
        ? 'This project has no configured time slots.'
        : null

  // Cache invalidation lives in useBookCamp itself — this only handles UI feedback.
  const handleBooked = () => {
    setBookOpen(false)
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
            <div className="text-right shrink-0">
              <Button
                onClick={() => setBookOpen(true)}
                disabled={!canBook}
                className="text-white"
                style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
              >
                <FiPlus size={14} /> New camp
              </Button>
              {cannotBookReason && (
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>{cannotBookReason}</p>
              )}
            </div>
          </div>

          <h1 className="text-base font-bold mb-2" style={{ color: 'var(--qms-text)' }}>{title}</h1>
          <PharmaCampsNav project={project} active={type} />

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
                <DialogTitle>New {typeLabel.toLowerCase()} camp</DialogTitle>
                <DialogDescription>Book a {typeLabel.toLowerCase()} camp against {project.name}.</DialogDescription>
              </DialogHeader>
              <BookCampForm
                needsMrPicker={needsMrPicker}
                type={type}
                project={{ id: project.id, name: project.name, campTimeSlots: project.campTimeSlots }}
                onBooked={handleBooked}
                onCancel={() => setBookOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}

export default TypeScopedPharmaCampsPage
