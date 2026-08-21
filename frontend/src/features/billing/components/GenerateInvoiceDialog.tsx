import { useCallback, useRef, useState } from 'react'
import type { ProjectEntity } from '@/types/project.types'
import { useBillingProject } from '@/features/billing/hooks/useBillingProject'
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

// Two steps: pick a project first (this dialog owns its own picker — the
// list page's project filter is unrelated and may be empty or set to a
// different project entirely), then pick camps to bill for that project.
const GenerateInvoiceDialog = ({ onClose, onCreated }: GenerateInvoiceDialogProps) => {
  const [projectId, setProjectId] = useState('')
  const [projectLabel, setProjectLabel] = useState('')
  const { data: projectData, isLoading: projectLoading, error: projectError, refetch: refetchProject } = useBillingProject(projectId || undefined)
  const project = projectData?.data ?? null

  if (project) {
    return <GenerateInvoiceCampStep project={project} onBack={() => { setProjectId(''); setProjectLabel('') }} onClose={onClose} onCreated={onCreated} />
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Generate invoice</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <BillingProjectPicker value={projectId} label={projectLabel} onChange={(id, label) => { setProjectId(id); setProjectLabel(label) }} />
          {projectId && projectError && (
            <div className="flex items-center justify-between gap-3 text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
              <span>Couldn't load this project.</span>
              <Button variant="outline" size="sm" onClick={() => refetchProject()} className="shrink-0">Retry</Button>
            </div>
          )}
          {projectId && !projectLoading && !projectError && !project && (
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
// here, unlike AddCampToInvoiceDialog (single-select, since that endpoint
// adds one line per call).
const GenerateInvoiceCampStep = ({ project, onBack, onClose, onCreated }: GenerateInvoiceCampStepProps) => {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const { data: camps, isLoading, isFetching: campsFetching, error: campsError, refetch } = useEligibleInvoiceCamps(project.id)
  const createInvoice = useCreateInvoice()
  // Synchronous guard against a fast double-click firing two overlapping
  // creates before React re-renders createInvoice.isPending onto the button
  // — mutateAsync itself doesn't block concurrent calls on the same hook.
  const submittingRef = useRef(false)

  // Mirrors AddCampToInvoiceDialog's isSettling: a background refetch
  // (isFetching) or an error leaves `camps` either stale or untrustworthy —
  // the submit button must not allow a stale selection through in either case.
  const isSettling = isLoading || campsFetching || !!campsError

  // Prunes any previously-selected camp id that's no longer present once
  // fresh data arrives (e.g. it became ineligible or was billed elsewhere in
  // the meantime). Adjusted during render (React's documented pattern for
  // state that must reset when a prop/query value changes — see "Storing
  // information from previous renders" in the React docs) rather than in a
  // useEffect, so there's no extra render pass after the fetch resolves.
  // Comparing against state (not a ref, which this project's lint rules
  // disallow reading/writing during render) is what makes this legal: the
  // setState call below only actually happens when `camps` reference changes
  // — React Query only produces a new reference when a fetch resolves with
  // new data — so this does not loop or run on every render.
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

  // onOpenChange fires for Escape, backdrop-click, AND the Cancel button —
  // it must check submittingRef.current (set synchronously the instant
  // handleSubmit starts), not createInvoice.isPending. isPending only
  // updates on React's NEXT render after mutateAsync begins; in the tiny
  // window between the mutation starting and that render committing,
  // isPending is still stale-false, so a dismissal attempt in that window
  // would have closed the dialog while the create was still genuinely in
  // flight. The Cancel button's visible `disabled` styling below still uses
  // isPending — that's a rendered prop, so it only needs to be correct once
  // React has actually re-rendered, unlike the dismissal guard here.
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
          <Button variant="ghost" onClick={onBack} disabled={createInvoice.isPending} className="mr-auto">Change project</Button>
          <Button variant="secondary" onClick={onClose} disabled={createInvoice.isPending}>Cancel</Button>
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
