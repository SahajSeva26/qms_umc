import { useQuery } from '@tanstack/react-query'
import { invoiceLineItemService } from '@/features/billing/invoiceLineItem.service'
import { invoiceLineItemKeys } from '@/features/billing/hooks/useInvoiceLineItems'
import type { InvoiceLineItemEntity } from '@/types/invoiceLineItem.types'

// Fetches every line item on an invoice, across all pages — used only where
// the CALLER needs the complete set (e.g. AddCampToInvoiceDialog's
// already-billed exclusion set), not for display, which stays paginated via
// useInvoiceLineItems. Replaces an earlier `limit: '1000'` shortcut, which
// was an arbitrary cap rather than a real "fetch everything" guarantee.
const PAGE_LIMIT = '50'

export const useAllInvoiceLineItems = (invoiceId: string | undefined) =>
  useQuery({
    // Key starts with invoiceLineItemKeys.all so useAddInvoiceLineItem/
    // useRemoveInvoiceLineItem's invalidateQueries({queryKey: invoiceLineItemKeys.all})
    // (partial-match by default) also invalidates THIS query — without this,
    // reopening Add Camp right after an add/remove could briefly offer a
    // camp that's actually already on/off the invoice.
    queryKey: [...invoiceLineItemKeys.all, 'all-pages', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return []
      const all: InvoiceLineItemEntity[] = []
      let page = 1
      let hasMore = true
      while (hasMore) {
        const res = await invoiceLineItemService.searchInvoiceLineItems({ invoice: invoiceId, page: String(page), limit: PAGE_LIMIT })
        const items = res.data?.items ?? []
        all.push(...items)
        const count = res.data?.count ?? 0
        hasMore = items.length > 0 && all.length < count
        page += 1
      }
      return all
    },
    enabled: !!invoiceId,
  })
