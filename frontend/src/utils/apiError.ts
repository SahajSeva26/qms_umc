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

// No `response` means no reply at all (refused/timeout/DNS) — not a credentials error.
export function isServerUnreachable(err: unknown): boolean {
  return axios.isAxiosError(err) && !err.response
}

// Server responded but with a 5xx/429 — reachable, just not working right now.
export function isServiceFailure(err: unknown): boolean {
  const status = axios.isAxiosError(err) ? err.response?.status : undefined
  return status !== undefined && (status >= 500 || status === 429)
}
