import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invoiceService } from '@/features/billing/invoice.service'
import { invoiceKeys } from '@/features/billing/hooks/useInvoices'
import type { MoveInvoiceStagePayload } from '@/features/billing/invoice.types'
import { toast } from '@/components/ui/sonner'
import { getApiErrorMessage } from '@/utils/apiError'

// Backs MoveInvoiceStageDialog — the backend has one moveStage(to, reason)
// endpoint, no separate approve/issue/cancel endpoints.
export const useMoveInvoiceStage = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MoveInvoiceStagePayload }) =>
      invoiceService.moveInvoiceStage(id, payload),
    onSuccess: (data, variables) => {
      // Write the mutation's own response (the updated invoice, already
      // returned by PATCH /invoices/:id/stage) directly into the exact
      // query useInvoice reads from — closes the window between the move
      // succeeding and invalidateQueries' background refetch landing, during
      // which InvoiceDetailDrawer could still show the OLD status/actions.
      queryClient.setQueryData(invoiceKeys.detail(variables.id), data)
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all })
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(variables.id) })
      toast.success('Invoice status updated')
    },
    onError: (err, variables) => {
      toast.error(getApiErrorMessage(err, 'Could not update invoice status — try again.'))
      // A failed move most often means the invoice's real status already
      // diverged from what this dialog was opened with (MoveInvoiceStageDialog
      // snapshots invoice.status/lineItemCount as props at open-time) — e.g.
      // another actor already moved it, or a concurrent line-item change
      // made the requested transition invalid. Invalidate the detail query
      // so the drawer behind this dialog refetches and reflects the TRUE
      // current status/actions instead of continuing to show whatever was
      // true when the dialog opened.
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(variables.id) })
    },
  })
}
