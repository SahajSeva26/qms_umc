import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type { CreateTestPayload, SearchTestQuery, TestEntity, UpdateTestPayload } from '@/types/test.types'

const searchTests = async (query: SearchTestQuery) => {
  const res = await api.get<PaginatedResponse<TestEntity>>('/tests', { params: query })
  return res.data
}

const getTest = async (id: string) => {
  const res = await api.get<ApiResponse<TestEntity>>(`/tests/${id}`)
  return res.data
}

const createTest = async (payload: CreateTestPayload) => {
  const res = await api.post<ApiResponse<TestEntity>>('/tests', payload)
  return res.data
}

const updateTest = async (id: string, payload: UpdateTestPayload) => {
  const res = await api.put<ApiResponse<TestEntity>>(`/tests/${id}`, payload)
  return res.data
}

export const testService = {
  searchTests,
  getTest,
  createTest,
  updateTest,
}
