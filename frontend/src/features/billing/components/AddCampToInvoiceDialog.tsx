import { useMemo, useRef, useState } from 'react'
import type { ProjectEntity } from '@/types/project.types'
import type { InvoiceEntity } from '@/types/invoice.types'
import { useEligibleInvoiceCamps } from '@/features/billing/hooks/useEligibleInvoiceCamps'
import { useAllInvoiceLineItems } from '@/features/billing/hooks/useAllInvoiceLineItems'
import { useAddInvoiceLineItem } from '@/features/billing/hooks/useAddInvoiceLineItem'
import CampSelectionRow from '@/features/billing/components/CampSelectionRow'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage } from '@/utils/apiError'

interface AddCampToInvoiceDialogProps {
  invoice: InvoiceEntity
  project: ProjectEntity
  onClose: () => void
  // Reports whether an add is currently in flight, so the parent drawer can
  // disable stage changes for the same reason it disables them during a
  // remove — an in-flight line mutation makes the current line count stale,
  // and approving mid-mutation could approve an invoice that's about to be
  // (or was just) emptied.
  onSubmittingChange?: (submitting: boolean) => void
}

// Single-select only, unlike GenerateInvoiceDialog — POST /invoice-line-items
// adds one line per call, so a multi-add UI here would issue N sequential
// requests that could partially fail, leaving an inconsistent draft.
const AddCampToInvoiceDialog = ({ invoice, project, onClose, onSubmittingChange }: AddCampToInvoiceDialogProps) => {
  const [selectedCampId, setSelectedCampId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { data: camps, isLoading: campsLoading, isFetching: campsFetching, error: campsError, refetch: refetchCamps } = useEligibleInvoiceCamps(project.id)
  const {
    data: allLineItems,
    isLoading: lineItemsLoading,
    isFetching: lineItemsFetching,
    error: lineItemsError,
    refetch: refetchLineItems,
  } = useAllInvoiceLineItems(invoice.id)
  const addLineItem = useAddInvoiceLineItem(invoice.id)
  // Synchronous guard against a fast double-click firing two overlapping
  // adds before React re-renders addLineItem.isPending onto the button.
  const submittingRef = useRef(false)

  const alreadyBilledCampIds = useMemo(() => {
    const ids = new Set<string>()
    for (const line of allLineItems ?? []) {
      const campId = typeof line.camp === 'string' ? line.camp : line.camp._id
      if (campId) ids.add(campId)
    }
    return ids
  }, [allLineItems])

  // If the existing-lines fetch failed, we can't safely know which camps are
  // already billed — showing camps anyway would risk re-offering ones
  // already on this invoice. The backend's own duplicate guard would still
  // reject a resubmit, but the UI must not imply an empty, ready-to-add list.
  // Memoized so its reference only changes when the underlying data actually
  // changes — needed as a stable effect dependency below (recomputing fresh
  // every render would otherwise fire that effect on every render).
  const selectableCamps = useMemo(
    () => (lineItemsError ? [] : (camps ?? []).filter((camp) => !alreadyBilledCampIds.has(camp.id))),
    [camps, alreadyBilledCampIds, lineItemsError],
  )
  const combinedError = campsError || lineItemsError
  const retryAll = () => {
    refetchCamps()
    refetchLineItems()
  }

  const handleToggle = (campId: string) => {
    setSelectedCampId((prev) => (prev === campId ? null : campId))
  }

  // Clears a previously-selected camp if fresh data no longer contains it
  // (e.g. it became ineligible or was billed elsewhere in the meantime).
  // Adjusted during render (React's documented pattern for state that must
  // reset when a prop/query value changes — see "Storing information from
  // previous renders" in the React docs) rather than in a useEffect, so
  // there's no extra render pass after the fetch resolves. Comparing against
  // state (not a ref, which this project's lint rules disallow
  // reading/writing during render) is what makes this legal: the setState
  // calls below only actually run when the memoized `selectableCamps`
  // reference changes, so this does not loop or run on every render.
  const [lastSelectable, setLastSelectable] = useState<typeof selectableCamps | undefined>(undefined)
  if (selectableCamps !== lastSelectable) {
    setLastSelectable(selectableCamps)
    if (selectedCampId !== null && !selectableCamps.some((camp) => camp.id === selectedCampId)) {
      setSelectedCampId(null)
    }
  }

  const handleSubmit = async () => {
    if (submittingRef.current) return
    if (!selectedCampId) {
      setError('Select a camp to add.')
      return
    }
    setError(null)
    submittingRef.current = true
    onSubmittingChange?.(true)
    try {
      await addLineItem.mutateAsync({ invoice: invoice.id, camp: selectedCampId })
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not add this camp — it may already be billed. Try another.'))
      submittingRef.current = false
      onSubmittingChange?.(false)
    }
  }

  // Drives QueryStateBlock's full loading skeleton — only the real first
  // load, so reopening the dialog with a warm cache doesn't flash the
  // skeleton over already-valid data on every background refetch.
  const isLoading = campsLoading || lineItemsLoading
  // Drives the submit button specifically. isLoading alone misses the case
  // this dialog exists to prevent: reopening right after adding a camp, the
  // OLD cached allLineItems renders immediately (isLoading is already false)
  // while the fresh refetch is still in flight — a just-added camp could
  // render as selectable again until that refetch lands. isFetching covers
  // background refetches that isLoading doesn't.
  const isSettling = isLoading || campsFetching || lineItemsFetching

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !addLineItem.isPending) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>
            Add camp · {invoice.code}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <QueryStateBlock
            isLoading={isLoading}
            error={combinedError}
            loadingLabel="Loading eligible camps…"
            errorLabel={
              lineItemsError
                ? "Couldn't check this invoice's existing camps — showing camps here could offer one already billed."
                : "Couldn't load eligible camps for this project."
            }
            onRetry={retryAll}
          >
            {selectableCamps.length === 0 && (
              <p className="text-[13px] py-4 text-center" style={{ color: 'var(--qms-text-muted)' }}>
                No more eligible camps to add — every billable, closed or cancelled-charged camp for this project is already on this invoice.
              </p>
            )}
            {selectableCamps.length > 0 && (
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {selectableCamps.map((camp) => (
                  <CampSelectionRow
                    key={camp.id}
                    camp={camp}
                    checked={selectedCampId === camp.id}
                    onToggle={handleToggle}
                    campCost={project.campCost}
                  />
                ))}
              </div>
            )}
          </QueryStateBlock>

          {error && <p className="text-[12px] text-danger">{error}</p>}
        </div>

        <div className="flex gap-2 justify-end mt-2">
          <Button variant="secondary" onClick={onClose} disabled={addLineItem.isPending}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            // Disabled while settling (including a background refetch after
            // reopening this dialog) or erroring — a selection made before
            // that resolves would otherwise stay submittable even though
            // `selectableCamps` can no longer be trusted as current.
            disabled={addLineItem.isPending || !selectedCampId || isSettling || !!combinedError}
            className="font-bold text-white"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            {addLineItem.isPending ? 'Adding…' : 'Add camp'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AddCampToInvoiceDialog
