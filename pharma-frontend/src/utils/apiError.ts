import axios from 'axios'

interface ApiErrorBody {
  message: string
  statusCode: number
  fields?: Record<string, string>
}

// Extracts the backend's ApiError message via axios's AxiosError<T> generic, avoiding an
// inline `(err: any)` cast at every mutation's onError.
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiErrorBody>(err)) {
    return err.response?.data?.message || fallback
  }
  return fallback
}

// 403 — caller lacks permission, or is missing required context (e.g. no assigned division).
// Retrying never helps.
export function isForbiddenError(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 403
}
