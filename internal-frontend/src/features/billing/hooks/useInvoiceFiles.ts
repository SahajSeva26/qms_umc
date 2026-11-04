import { useQuery, type QueryKey } from '@tanstack/react-query'
import { invoiceService } from '@/features/billing/invoice.service'
import type { InvoiceFileRelation } from '@/types/invoice.types'

// Lists an invoice's active files for one relation (currently just 'grn'), with presigned read
// urls. staleTime:0 — a background refetch after an upload must never serve a stale read url.
export const invoiceFilesKeys = {
  list: (invoiceId: string, relation: InvoiceFileRelation): QueryKey => ['invoices', 'files', invoiceId, relation],
}

export function useInvoiceFiles(invoiceId: string, relation: InvoiceFileRelation, enabled = true) {
  const query = useQuery({
    queryKey: invoiceFilesKeys.list(invoiceId, relation),
    queryFn: () => invoiceService.getInvoiceFiles({ entityId: invoiceId, relation }),
    enabled: enabled && !!invoiceId,
    staleTime: 0,
  })

  return {
    files: query.data?.data?.items ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    // throwOnError — a bare refetch() resolves (not rejects) on failure, so without this a caller
    // awaiting it (e.g. post-activation) would see success and never learn the refresh failed.
    refetch: () => query.refetch({ throwOnError: true }),
  }
}
