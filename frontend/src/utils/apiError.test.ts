import { describe, it, expect } from 'vitest'
import type { AxiosError } from 'axios'
import { isForbiddenError } from '@/utils/apiError'

function axiosError(status: number): AxiosError {
  const err = new Error('request failed') as AxiosError
  err.isAxiosError = true
  err.response = { status, data: {}, statusText: '', headers: {}, config: {} as never }
  err.toJSON = () => ({})
  return err
}

describe('isForbiddenError', () => {
  it('returns true for a 403 axios error', () => {
    expect(isForbiddenError(axiosError(403))).toBe(true)
  })

  it('returns false for other statuses', () => {
    expect(isForbiddenError(axiosError(401))).toBe(false)
    expect(isForbiddenError(axiosError(404))).toBe(false)
    expect(isForbiddenError(axiosError(500))).toBe(false)
  })

  it('returns false for a non-axios error', () => {
    expect(isForbiddenError(new Error('boom'))).toBe(false)
  })

  it('returns false for a non-error value', () => {
    expect(isForbiddenError(undefined)).toBe(false)
    expect(isForbiddenError(null)).toBe(false)
  })
})
