import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invoiceService } from '@/features/billing/invoice.service'
import { invoiceFilesKeys } from '@/features/billing/hooks/useInvoiceFiles'
import type { InvoiceFileRelation } from '@/types/invoice.types'

export const useDiscardInvoiceFile = (invoiceId: string, relation: InvoiceFileRelation) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (fileId: string) => invoiceService.discardInvoiceFile(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceFilesKeys.list(invoiceId, relation) })
    },
  })
}
