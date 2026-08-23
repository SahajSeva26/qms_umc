import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { useEntityQuery } from '@/hooks/useEntityQuery'
import { invoiceLineItemService } from '@/features/billing/invoiceLineItem.service'
import type { SearchInvoiceLineItemQuery } from '@/features/billing/invoiceLineItem.types'

export const invoiceLineItemKeys = createEntityKeys<SearchInvoiceLineItemQuery>('invoice-line-items', 'invoice-line-item')

export const useInvoiceLineItems = (query: SearchInvoiceLineItemQuery, enabled = true) =>
  useEntityQuery(invoiceLineItemKeys, invoiceLineItemService.searchInvoiceLineItems, query, { enabled })
