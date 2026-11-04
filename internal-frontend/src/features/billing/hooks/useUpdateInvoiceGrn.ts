import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invoiceService } from '@/features/billing/invoice.service'
import { invoiceKeys } from '@/features/billing/hooks/useInvoices'
import { toast } from '@/components/ui/sonner'
import { getApiErrorMessage } from '@/utils/apiError'

// Sets the real grn.number field via PUT /invoices/:id — replaces the earlier frontend-only
// encoding into stageHistory.reason now that the backend has a real field for it.
export const useUpdateInvoiceGrn = (invoiceId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (grnNumber: string) => invoiceService.updateInvoice(invoiceId, { grn: { number: grnNumber } }),
    onSuccess: (data) => {
      queryClient.setQueryData(invoiceKeys.detail(invoiceId), data)
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) })
      toast.success('GRN number saved')
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Could not save the GRN number — try again.'))
    },
  })
}
