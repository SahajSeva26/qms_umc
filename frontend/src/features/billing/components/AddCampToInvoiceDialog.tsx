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
  // Drawer's own refetched draft status — can flip false while this dialog
  // is open; disables submission instead of unmounting, so an error stays visible.
  isInvoiceDraft: boolean
  onClose: () => void
  // Lets the parent drawer disable stage changes while an add is in flight,
  // since the current line count is stale until it settles.
  onSubmittingChange?: (submitting: boolean) => void
}

// Single-select only, unlike GenerateInvoiceDialog — POST /invoice-line-items
// adds one line per call, so multi-add here would risk a partially-failed draft.
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
  // Synchronous guard against a double-click firing two adds before
  // isPending re-renders onto the button.
  const submittingRef = useRef(false)

  const alreadyBilledCampIds = useMemo(() => {
    const ids = new Set<string>()
    for (const line of allLineItems ?? []) {
      const campId = typeof line.camp === 'string' ? line.camp : line.camp._id
      if (campId) ids.add(campId)
    }
    return ids
  }, [allLineItems])

  // If the existing-lines fetch failed, we can't know which camps are
  // already billed — show none rather than risk re-offering one already on this invoice.
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

  // Clears a stale selection if fresh data drops it (ineligible/billed
  // elsewhere) — adjusted during render, comparing against state per this repo's lint rules.
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
      // Unlike success (already invalidated via onSuccess), a failure here
      // leaves this dialog's own sources and the parent drawer's invoice query stale — refresh both.
      refetchCamps()
      refetchLineItems()
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(invoice.id) })
    }
  }

  // Real first load only, so a warm-cache reopen doesn't flash the skeleton.
  const isLoading = campsLoading || lineItemsLoading
  // isLoading alone misses reopening right after an add: cached data renders
  // before the refetch that would exclude it lands.
  const isSettling = isLoading || campsFetching || lineItemsFetching

  // Must check submittingRef.current, not isPending — isPending lags a
  // render behind, leaving a window where dismissal could close mid-submit.
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
          {/* Same submittingRef.current guard as onOpenChange — a separate
              click handler not routed through it, same race window. */}
          <Button variant="secondary" onClick={() => { if (!submittingRef.current) onClose() }} disabled={addLineItem.isPending}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            // Disabled while settling/erroring (selectableCamps untrustworthy)
            // or once isInvoiceDraft flips false — see prop doc above.
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
