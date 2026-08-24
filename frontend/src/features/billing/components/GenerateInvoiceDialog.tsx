import { useCallback, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ProjectEntity } from '@/types/project.types'
import type { ApiResponse } from '@/types/common.types'
import { billingProjectsService } from '@/features/billing/billingProjects.service'
import { useEligibleInvoiceCamps } from '@/features/billing/hooks/useEligibleInvoiceCamps'
import { useCreateInvoice } from '@/features/billing/hooks/useCreateInvoice'
import { createInvoiceSchema } from '@/features/billing/schemas/invoice.schemas'
import CampSelectionRow from '@/features/billing/components/CampSelectionRow'
import BillingProjectPicker from '@/features/billing/components/BillingProjectPicker'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage } from '@/utils/apiError'

interface GenerateInvoiceDialogProps {
  onClose: () => void
  onCreated: (invoiceId: string) => void
}

// Two steps: pick a project first (this dialog owns its own picker,
// independent of the list page's filter), then pick camps to bill.
const GenerateInvoiceDialog = ({ onClose, onCreated }: GenerateInvoiceDialogProps) => {
  const queryClient = useQueryClient()
  const [projectId, setProjectId] = useState('')
  const [projectLabel, setProjectLabel] = useState('')
  // enabled: false — this query only passively reads what confirmProject
  // writes via setQueryData; without this it'd fire a redundant second GET.
  const { data: projectData } = useQuery<ApiResponse<ProjectEntity>>({
    queryKey: ['billing', 'project', projectId],
    queryFn: () => billingProjectsService.getProject(projectId),
    enabled: false,
  })
  const project = projectId && projectData ? projectData.data : null

  // campCost is financially material — a cached project id must still be
  // re-fetched explicitly before advancing, so a stale campCost is never displayed.
  const [confirmedProjectId, setConfirmedProjectId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState(false)
  // Bumped synchronously in handleProjectChange (not a useEffect, which
  // would commit too late) so a fast-resolving fetch can detect a superseding pick.
  const operationTokenRef = useRef(0)

  const confirmProject = async (id: string, token: number) => {
    setConfirming(true)
    setConfirmedProjectId(null)
    setConfirmError(false)
    try {
      const res = await billingProjectsService.getProject(id)
      if (operationTokenRef.current !== token) return
      queryClient.setQueryData<ApiResponse<ProjectEntity>>(['billing', 'project', id], res)
      setConfirmedProjectId(id)
    } catch {
      if (operationTokenRef.current !== token) return
      setConfirmError(true)
    } finally {
      if (operationTokenRef.current === token) setConfirming(false)
    }
  }

  const handleProjectChange = (id: string, label: string) => {
    operationTokenRef.current += 1
    setProjectId(id)
    setProjectLabel(label)
    setConfirmedProjectId(null)
    setConfirmError(false)
    if (id) confirmProject(id, operationTokenRef.current)
  }

  // Retry also bumps the token — a new attempt superseding the failed one.
  const retryConfirmProject = () => {
    operationTokenRef.current += 1
    confirmProject(projectId, operationTokenRef.current)
  }

  if (project && confirmedProjectId === projectId) {
    return <GenerateInvoiceCampStep project={project} onBack={() => { setProjectId(''); setProjectLabel(''); setConfirmedProjectId(null) }} onClose={onClose} onCreated={onCreated} />
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Generate invoice</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <BillingProjectPicker value={projectId} label={projectLabel} onChange={handleProjectChange} />
          {projectId && confirmError && (
            <div className="flex items-center justify-between gap-3 text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
              <span>Couldn't load this project.</span>
              <Button variant="outline" size="sm" onClick={retryConfirmProject} className="shrink-0">Retry</Button>
            </div>
          )}
          {projectId && !confirming && !confirmError && confirmedProjectId === projectId && !project && (
            <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>This project could not be found.</p>
          )}
        </div>
        <div className="flex gap-2 justify-end mt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface GenerateInvoiceCampStepProps {
  project: ProjectEntity
  onBack: () => void
  onClose: () => void
  onCreated: (invoiceId: string) => void
}

// Create is one atomic backend call with N camps — multi-select is correct
// here, unlike AddCampToInvoiceDialog's single-select (one line per call).
const GenerateInvoiceCampStep = ({ project, onBack, onClose, onCreated }: GenerateInvoiceCampStepProps) => {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const { data: camps, isLoading, isFetching: campsFetching, error: campsError, refetch } = useEligibleInvoiceCamps(project.id)
  const createInvoice = useCreateInvoice()
  // Synchronous guard against a double-click firing two creates before
  // isPending re-renders onto the button.
  const submittingRef = useRef(false)

  // Mirrors AddCampToInvoiceDialog's isSettling — a refetch or error leaves
  // `camps` untrustworthy for submission.
  const isSettling = isLoading || campsFetching || !!campsError

  // Prunes a selected id no longer present in fresh data — adjusted during
  // render, comparing against state per this repo's lint rules.
  const [lastCamps, setLastCamps] = useState<typeof camps>(undefined)
  if (camps && camps !== lastCamps) {
    setLastCamps(camps)
    const validIds = new Set(camps.map((camp) => camp.id))
    setSelected((prev) => {
      if (prev.size === 0) return prev
      const next = new Set(Array.from(prev).filter((id) => validIds.has(id)))
      return next.size === prev.size ? prev : next
    })
  }

  const toggleCamp = useCallback((campId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(campId)) next.delete(campId)
      else next.add(campId)
      return next
    })
  }, [])

  const handleSubmit = async () => {
    if (submittingRef.current) return
    const camps = Array.from(selected)
    const result = createInvoiceSchema.safeParse({ project: project.id, camps })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Please complete the required fields.')
      return
    }
    setError(null)
    submittingRef.current = true
    try {
      const res = await createInvoice.mutateAsync({ project: project.id, camps })
      if (res.data) onCreated(res.data.id)
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not generate the invoice — try again.'))
      submittingRef.current = false
    }
  }

  // Must check submittingRef.current, not isPending — isPending lags a
  // render behind mutateAsync starting, leaving a dismissal race window.
  return (
    <Dialog open onOpenChange={(o) => { if (!o && !submittingRef.current) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>
            Generate invoice · {project.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: 'var(--qms-text-muted)' }}>
            Select camps to bill ({selected.size} selected)
          </div>

          <QueryStateBlock
            isLoading={isLoading}
            error={campsError}
            loadingLabel="Loading eligible camps…"
            errorLabel="Couldn't load eligible camps for this project."
            onRetry={() => refetch()}
          >
            {camps && camps.length === 0 && (
              <p className="text-[13px] py-4 text-center" style={{ color: 'var(--qms-text-muted)' }}>
                No billable, closed or cancelled-charged camps are available for this project yet.
              </p>
            )}
            {camps && camps.length > 0 && (
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {camps.map((camp) => (
                  <CampSelectionRow
                    key={camp.id}
                    camp={camp}
                    checked={selected.has(camp.id)}
                    onToggle={toggleCamp}
                    campCost={project.campCost}
                  />
                ))}
              </div>
            )}
          </QueryStateBlock>

          {error && <p className="text-[12px] text-danger">{error}</p>}
        </div>

        <div className="flex gap-2 justify-end mt-2">
          {/* Same submittingRef.current guard as onOpenChange — separate
              click handlers not routed through it, same race window. */}
          <Button variant="ghost" onClick={() => { if (!submittingRef.current) onBack() }} disabled={createInvoice.isPending} className="mr-auto">Change project</Button>
          <Button variant="secondary" onClick={() => { if (!submittingRef.current) onClose() }} disabled={createInvoice.isPending}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={createInvoice.isPending || selected.size === 0 || isSettling}
            className="font-bold text-white"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            {createInvoice.isPending ? 'Generating…' : `Generate invoice (${selected.size})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default GenerateInvoiceDialog
