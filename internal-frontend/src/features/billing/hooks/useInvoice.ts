import { useGetEntity } from '@/hooks/useGetEntity'
import { invoiceService } from '@/features/billing/invoice.service'
import { invoiceKeys } from '@/features/billing/hooks/useInvoices'

export const useInvoice = (id: string | undefined) =>
  useGetEntity(invoiceKeys.detail, invoiceService.getInvoice, id)
