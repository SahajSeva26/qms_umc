import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type { FileEntity } from '@/types/file.types'
import type {
  CreateInvoicePayload,
  GetInvoiceFilesQuery,
  InvoiceEntity,
  InvoiceFileActivatePayload,
  InvoiceFilePostPayload,
  InvoiceReportQuery,
  InvoiceReportResponse,
  MoveInvoiceStagePayload,
  SearchInvoiceQuery,
  UpdateInvoicePayload,
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

// Used here only to set the GRN number (grn.number) — everything else on this payload goes
// through a dedicated edit flow this drawer doesn't have yet.
const updateInvoice = async (id: string, payload: UpdateInvoicePayload) => {
  const res = await api.put<ApiResponse<InvoiceEntity>>(`/invoices/${id}`, payload)
  return res.data
}

// Tenant-wide pipeline totals + per-status breakdown, unaffected by list pagination.
const getInvoiceReport = async (query: InvoiceReportQuery = {}) => {
  const res = await api.get<ApiResponse<InvoiceReportResponse>>('/invoices/report', { params: query })
  return res.data
}

// GRN document — same create -> S3 PUT -> activate -> discard lifecycle as camp photos
// (campsReal.service.ts), scoped to the invoice file endpoints instead.
const createInvoiceFiles = async (payload: InvoiceFilePostPayload) => {
  const res = await api.post<ApiResponse<FileEntity[]>>('/invoices/files', payload)
  return res.data
}

const activateInvoiceFiles = async (payload: InvoiceFileActivatePayload) => {
  const res = await api.post<ApiResponse<FileEntity[]>>('/invoices/files/activate', payload)
  return res.data
}

const getInvoiceFiles = async (query: GetInvoiceFilesQuery) => {
  const res = await api.get<PaginatedResponse<FileEntity>>('/invoices/files', { params: query })
  return res.data
}

const discardInvoiceFile = async (fileId: string) => {
  const res = await api.delete<ApiResponse<FileEntity>>(`/invoices/files/${fileId}`)
  return res.data
}

export const invoiceService = {
  searchInvoices,
  getInvoice,
  createInvoice,
  moveInvoiceStage,
  updateInvoice,
  getInvoiceReport,
  createInvoiceFiles,
  activateInvoiceFiles,
  getInvoiceFiles,
  discardInvoiceFile,
}
