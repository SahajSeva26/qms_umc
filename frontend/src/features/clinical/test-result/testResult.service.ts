import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type { CreateTestResultPayload, SearchTestResultQuery, TestResultEntity, UpdateTestResultPayload } from '@/features/clinical/test-result/testResult.types'

const searchTestResults = async (query: SearchTestResultQuery) => {
  const res = await api.get<PaginatedResponse<TestResultEntity>>('/tests', { params: query })
  return res.data
}

const getTestResult = async (id: string) => {
  const res = await api.get<ApiResponse<TestResultEntity>>(`/tests/${id}`)
  return res.data
}

const createTestResult = async (payload: CreateTestResultPayload) => {
  const res = await api.post<ApiResponse<TestResultEntity>>('/tests', payload)
  return res.data
}

const updateTestResult = async (id: string, payload: UpdateTestResultPayload) => {
  const res = await api.put<ApiResponse<TestResultEntity>>(`/tests/${id}`, payload)
  return res.data
}

export const testResultService = {
  searchTestResults,
  getTestResult,
  createTestResult,
  updateTestResult,
}
