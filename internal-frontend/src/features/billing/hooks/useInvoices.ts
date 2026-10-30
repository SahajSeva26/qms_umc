import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { useEntityQuery } from '@/hooks/useEntityQuery'
import { invoiceService } from '@/features/billing/invoice.service'
import type { SearchInvoiceQuery } from '@/types/invoice.types'

export const invoiceKeys = createEntityKeys<SearchInvoiceQuery>('invoices', 'invoice')

// enabled must be false when no project is selected — reads are unscoped (platform tenant), so an
// unguarded search returns every invoice on the platform instead of nothing.
export const useInvoices = (query: SearchInvoiceQuery, enabled = true, options?: { retry?: boolean }) =>
  useEntityQuery(invoiceKeys, invoiceService.searchInvoices, query, { enabled, retry: options?.retry })
