import { useUpdateEntity } from '@/hooks/useUpdateEntity'
import { invoiceLineItemService } from '@/features/billing/invoiceLineItem.service'
import { invoiceLineItemKeys } from '@/features/billing/hooks/useInvoiceLineItems'
import { invoiceKeys } from '@/features/billing/hooks/useInvoices'

// Same 3-way invalidation as useAddInvoiceLineItem — removing a line also
// recomputes the parent invoice's subtotal/total server-side.
export const useRemoveInvoiceLineItem = (invoiceId: string) =>
  useUpdateEntity(
    (lineItemId: string) => invoiceLineItemService.removeInvoiceLineItem(lineItemId),
    [invoiceLineItemKeys.all, invoiceKeys.detail(invoiceId), invoiceKeys.all],
  )
