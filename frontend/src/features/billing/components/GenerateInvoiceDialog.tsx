import { useCallback, useRef, useState } from 'react'
import type { ProjectEntity } from '@/types/project.types'
import { useEligibleInvoiceCamps } from '@/features/billing/hooks/useEligibleInvoiceCamps'
import { useCreateInvoice } from '@/features/billing/hooks/useCreateInvoice'
import { createInvoiceSchema } from '@/features/billing/schemas/invoice.schemas'
import CampSelectionRow from '@/features/billing/components/CampSelectionRow'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage } from '@/utils/apiError'

interface GenerateInvoiceDialogProps {
  project: ProjectEntity
  onClose: () => void
  onCreated: (invoiceId: string) => void
}

// Create is one atomic backend call with N camps — multi-select is correct
// here, unlike AddCampToInvoiceDialog (single-select, since that endpoint
// adds one line per call).
const GenerateInvoiceDialog = ({ project, onClose, onCreated }: GenerateInvoiceDialogProps) => {
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

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !createInvoice.isPending) onClose() }}>
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
