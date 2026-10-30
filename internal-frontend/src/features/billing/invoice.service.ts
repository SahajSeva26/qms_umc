import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type {
  CreateInvoicePayload,
  InvoiceEntity,
  InvoiceReportQuery,
  InvoiceReportResponse,
  MoveInvoiceStagePayload,
  SearchInvoiceQuery,
} from '@/types/invoice.types'

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

// Response isn't populated — tenant/project echo back as bare ObjectId strings; refetch via useInvoice(id) if needed.
const createInvoice = async (payload: CreateInvoicePayload) => {
  const res = await api.post<ApiResponse<InvoiceEntity>>('/invoices', payload)
  return res.data
}

const moveInvoiceStage = async (id: string, payload: MoveInvoiceStagePayload) => {
  const res = await api.patch<ApiResponse<InvoiceEntity>>(`/invoices/${id}/stage`, payload)
  return res.data
}

// Tenant-wide pipeline totals + per-status breakdown, unaffected by list pagination.
const getInvoiceReport = async (query: InvoiceReportQuery = {}) => {
  const res = await api.get<ApiResponse<InvoiceReportResponse>>('/invoices/report', { params: query })
  return res.data
}

export const invoiceService = {
  searchInvoices,
  getInvoice,
  createInvoice,
  moveInvoiceStage,
  getInvoiceReport,
}
