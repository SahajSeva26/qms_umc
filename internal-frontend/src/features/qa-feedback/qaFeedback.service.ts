import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type {
  CreateQaFeedbackPayload,
  QaFeedbackEntity,
  SearchQaFeedbackQuery,
  UpdateQaFeedbackPayload,
} from '@/types/qaFeedback.types'

// Follows the exact pattern of accessManagement.service.ts / crm.service.ts —
// same shared `api` axios instance, same ApiResponse/PaginatedResponse
// envelope typing, a plain object export, no class/default export.

const searchFeedback = async (query: SearchQaFeedbackQuery) => {
  const res = await api.get<PaginatedResponse<QaFeedbackEntity>>('/qa-feedback', { params: query })
  return res.data
}

const getFeedback = async (id: string) => {
  const res = await api.get<ApiResponse<QaFeedbackEntity>>(`/qa-feedback/${id}`)
  return res.data
}

const createFeedback = async (payload: CreateQaFeedbackPayload) => {
  const res = await api.post<ApiResponse<QaFeedbackEntity>>('/qa-feedback', payload)
  return res.data
}

const updateFeedback = async (id: string, payload: UpdateQaFeedbackPayload) => {
  const res = await api.put<ApiResponse<QaFeedbackEntity>>(`/qa-feedback/${id}`, payload)
  return res.data
}

export const qaFeedbackService = {
  searchFeedback,
  getFeedback,
  createFeedback,
  updateFeedback,
}
