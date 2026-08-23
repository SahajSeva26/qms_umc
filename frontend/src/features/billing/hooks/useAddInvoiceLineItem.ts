import { useUpdateEntity } from '@/hooks/useUpdateEntity'
import { invoiceLineItemService } from '@/features/billing/invoiceLineItem.service'
import { invoiceLineItemKeys } from '@/features/billing/hooks/useInvoiceLineItems'
import { invoiceKeys } from '@/features/billing/hooks/useInvoices'
import type { CreateInvoiceLineItemPayload } from '@/features/billing/invoiceLineItem.types'

// Adding a line changes the parent invoice's subtotal/total server-side, so
// this must invalidate the line-items list, the invoice detail, AND the
// invoice list (its displayed total column changes too) — not just the
// line-items query.
export const useAddInvoiceLineItem = (invoiceId: string) =>
  useUpdateEntity(
    (payload: CreateInvoiceLineItemPayload) => invoiceLineItemService.createInvoiceLineItem(payload),
    [invoiceLineItemKeys.all, invoiceKeys.detail(invoiceId), invoiceKeys.all],
  )
