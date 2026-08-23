import { useCreateEntity } from '@/hooks/useCreateEntity'
import { invoiceService } from '@/features/billing/invoice.service'
import { invoiceKeys } from '@/features/billing/hooks/useInvoices'
import type { CreateInvoicePayload } from '@/features/billing/invoice.types'

export const useCreateInvoice = () =>
  useCreateEntity((payload: CreateInvoicePayload) => invoiceService.createInvoice(payload), invoiceKeys.all)
