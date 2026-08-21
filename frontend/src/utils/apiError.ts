import axios from 'axios'
import type { ApiError } from '@/types/common.types'

// Extracts the backend's ApiError message safely via axios's AxiosError<T> generic,
// avoiding an inline `(err: any)` cast at every mutation's onError.
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiError>(err)) {
    return err.response?.data?.message || fallback
  }
  return fallback
}
