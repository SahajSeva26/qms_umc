import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { invoiceService } from '@/features/billing/invoice.service'
import type { SearchInvoiceQuery } from '@/types/invoice.types'

// Shared, read-only invoices query — lets other features (e.g. weekly-plan) search invoices
// without depending on billing's own hook.
const invoiceSharedKeys = createEntityKeys<SearchInvoiceQuery>('invoices', 'invoice')

export const useInvoicesShared = (query: SearchInvoiceQuery, enabled = true) =>
  useEntityQuery(invoiceSharedKeys, (q) => invoiceService.searchInvoices(q), query, { enabled })
