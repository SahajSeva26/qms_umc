import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { useEntityQuery } from '@/hooks/useEntityQuery'
import { invoiceService } from '@/features/billing/invoice.service'
import type { SearchInvoiceQuery } from '@/types/invoice.types'

export const invoiceKeys = createEntityKeys<SearchInvoiceQuery>('invoices', 'invoice')

// enabled must be passed false by the caller whenever no project is
// selected — this account's reads are unscoped (platform tenant), so an
// unguarded search here would return every invoice across the platform
// instead of nothing.
export const useInvoices = (query: SearchInvoiceQuery, enabled = true) =>
  useEntityQuery(invoiceKeys, invoiceService.searchInvoices, query, { enabled })
