import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type {
  CreateInvoicePayload,
  InvoiceEntity,
  MoveInvoiceStagePayload,
  SearchInvoiceQuery,
} from '@/features/billing/invoice.types'

// Follows the exact pattern of projectsService — same shared `api` axios
// instance, same ApiResponse/PaginatedResponse envelope typing, a plain
// object export, no class/default export.
const DEFAULT_LIMIT = '10'

const searchInvoices = async (query: SearchInvoiceQuery) => {
  const res = await api.get<PaginatedResponse<InvoiceEntity>>('/invoices', {
    params: { limit: DEFAULT_LIMIT, ...query },
  })
  return res.data
}

const getInvoice = async (id: string) => {
  const res = await api.get<ApiResponse<InvoiceEntity>>(`/invoices/${id}`)
  return res.data
}

// NOTE: response is NOT populated — invoice.service.ts's create() never
// re-fetches with populate before returning. tenant/project echo back as
// bare ObjectId strings. Callers needing populated relations should
// invalidate + refetch via useInvoice(id).
const createInvoice = async (payload: CreateInvoicePayload) => {
  const res = await api.post<ApiResponse<InvoiceEntity>>('/invoices', payload)
  return res.data
}

const moveInvoiceStage = async (id: string, payload: MoveInvoiceStagePayload) => {
  const res = await api.patch<ApiResponse<InvoiceEntity>>(`/invoices/${id}/stage`, payload)
  return res.data
}

export const invoiceService = {
  searchInvoices,
  getInvoice,
  createInvoice,
  moveInvoiceStage,
}
