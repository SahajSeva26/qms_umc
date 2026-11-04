import { useQuery } from '@tanstack/react-query'
import { invoiceService } from '@/features/billing/invoice.service'
import { invoiceKeys } from '@/features/billing/hooks/useInvoices'
import type { InvoiceReportQuery } from '@/types/invoice.types'

// Keyed under invoiceKeys.all so existing invalidateQueries({queryKey: invoiceKeys.all}) calls prefix-match this too.
export const useInvoiceReport = (query: InvoiceReportQuery = {}, enabled = true, options?: { retry?: boolean }) => {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [...invoiceKeys.all, 'report', query],
    queryFn: () => invoiceService.getInvoiceReport(query),
    enabled,
    staleTime: 60_000,
    ...(options?.retry !== undefined ? { retry: options.retry } : {}),
  })

  return { report: data?.data, isLoading, isError, error, refetch }
}
