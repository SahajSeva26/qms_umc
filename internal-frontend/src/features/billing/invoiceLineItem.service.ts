import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type { CreateInvoiceLineItemPayload, InvoiceLineItemEntity, SearchInvoiceLineItemQuery } from '@/types/invoiceLineItem.types'

const DEFAULT_LIMIT = '10'

const searchInvoiceLineItems = async (query: SearchInvoiceLineItemQuery) => {
  const res = await api.get<PaginatedResponse<InvoiceLineItemEntity>>('/invoice-line-items', {
    params: { limit: DEFAULT_LIMIT, ...query },
  })
  return res.data
}

const createInvoiceLineItem = async (payload: CreateInvoiceLineItemPayload) => {
  const res = await api.post<ApiResponse<InvoiceLineItemEntity>>('/invoice-line-items', payload)
  return res.data
}

const removeInvoiceLineItem = async (id: string) => {
  const res = await api.delete<ApiResponse<InvoiceLineItemEntity>>(`/invoice-line-items/${id}`)
  return res.data
}

export const invoiceLineItemService = {
  searchInvoiceLineItems,
  createInvoiceLineItem,
  removeInvoiceLineItem,
}
