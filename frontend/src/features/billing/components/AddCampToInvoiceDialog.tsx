import { useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { ProjectEntity } from '@/types/project.types'
import type { InvoiceEntity } from '@/types/invoice.types'
import { useEligibleInvoiceCamps } from '@/features/billing/hooks/useEligibleInvoiceCamps'
import { useAllInvoiceLineItems } from '@/features/billing/hooks/useAllInvoiceLineItems'
import { useAddInvoiceLineItem } from '@/features/billing/hooks/useAddInvoiceLineItem'
import { invoiceKeys } from '@/features/billing/hooks/useInvoices'
import CampSelectionRow from '@/features/billing/components/CampSelectionRow'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage } from '@/utils/apiError'

interface AddCampToInvoiceDialogProps {
  invoice: InvoiceEntity
  project: ProjectEntity
  // The drawer's OWN, independently-refetched view of whether this invoice
  // is still a draft — can flip to false while this dialog is still open
  // (e.g. a failed add's own catch block below invalidates the invoice
  // detail query, and that refetch confirms someone else approved it
  // concurrently). Disables further submission rather than the parent
  // unmounting this dialog outright, which would otherwise discard whatever
  // error message is already showing.
  isInvoiceDraft: boolean
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
const AddCampToInvoiceDialog = ({ invoice, project, isInvoiceDraft, onClose, onSubmittingChange }: AddCampToInvoiceDialogProps) => {
  const queryClient = useQueryClient()
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
    if (submittingRef.current || !isInvoiceDraft) return
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
      // Unlike a success (which useAddInvoiceLineItem's onSuccess already
      // invalidates), a failure here leaves this dialog's own state stale —
      // most commonly a 409 because the camp was billed elsewhere or the
      // invoice left draft status concurrently. Refetch this dialog's own
      // sources so the picker reflects reality (the just-failed camp may
      // now need excluding), AND invalidate the invoice detail query the
      // parent drawer reads — so if the invoice's status changed underneath
      // this dialog, the drawer picks that up once this dialog closes,
      // instead of continuing to show stale "still draft" controls.
      refetchCamps()
      refetchLineItems()
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(invoice.id) })
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

  // onOpenChange fires for Escape, backdrop-click, AND the Cancel button —
  // it must check submittingRef.current (set synchronously the instant
  // handleSubmit starts), not addLineItem.isPending. isPending only updates
  // on React's NEXT render after mutateAsync begins; in the tiny window
  // between the mutation starting and that render committing, isPending is
  // still stale-false, so a dismissal attempt in that window would have
  // closed the dialog while the add was still genuinely in flight. The
  // Cancel button's visible `disabled` styling below still uses isPending —
  // that's a rendered prop, so it only needs to be correct once React has
  // actually re-rendered, unlike the dismissal guard here.
  return (
    <Dialog open onOpenChange={(o) => { if (!o && !submittingRef.current) onClose() }}>
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
          {!isInvoiceDraft && (
            <p className="text-[12px] text-danger">This invoice is no longer a draft — camps can't be added anymore.</p>
          )}
        </div>

        <div className="flex gap-2 justify-end mt-2">
          {/* Same submittingRef.current guard as onOpenChange above — this
              is a separate click handler, not routed through onOpenChange,
              so without this check it could still close in the tiny window
              between handleSubmit starting and addLineItem.isPending's next
              render actually reflecting it. */}
          <Button variant="secondary" onClick={() => { if (!submittingRef.current) onClose() }} disabled={addLineItem.isPending}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            // Disabled while settling (including a background refetch after
            // reopening this dialog) or erroring — a selection made before
            // that resolves would otherwise stay submittable even though
            // `selectableCamps` can no longer be trusted as current. Also
            // disabled once the drawer's own refetch confirms this invoice
            // left draft concurrently — see isInvoiceDraft doc comment above.
            disabled={addLineItem.isPending || !selectedCampId || isSettling || !!combinedError || !isInvoiceDraft}
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
