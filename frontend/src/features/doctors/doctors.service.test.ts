import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AxiosError } from 'axios'

vi.mock('@/lib/api/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

function axiosError(status: number, data: unknown): AxiosError {
  const err = new Error('request failed') as AxiosError
  err.isAxiosError = true
  err.response = { status, data, statusText: '', headers: {}, config: {} as never }
  err.toJSON = () => ({})
  return err
}

describe('doctorsService.bulkCreateDoctors', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns the full result object on a clean 200', async () => {
    const api = (await import('@/lib/api/api')).default
    const result = { totalRows: 3, validRows: 3, invalidRows: 0, created: 3, failed: 0, errors: [] }
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, message: '', data: result } })

    const { doctorsService } = await import('./doctors.service')
    const out = await doctorsService.bulkCreateDoctors({ file: new File(['x'], 'a.csv') })

    expect(out).toEqual(result)
  })

  // Doctor bulk's 400 path returns the FULL result object, unlike MR bulk
  // (which only returns a bare errors array on 400).
  it('returns the full result object (not just errors) on a genuine partial-failure 400', async () => {
    const api = (await import('@/lib/api/api')).default
    const result = { totalRows: 5, validRows: 3, invalidRows: 2, created: 3, failed: 2, errors: [{ row: 2, error: 'Duplicate pharmaCode' }] }
    vi.mocked(api.post).mockRejectedValue(axiosError(400, { success: false, message: 'partial failure', data: result }))

    const { doctorsService } = await import('./doctors.service')
    const out = await doctorsService.bulkCreateDoctors({ file: new File(['x'], 'a.csv') })

    expect(out).toEqual(result)
  })

  it('rejects (does not miscast) a 400 caused by payload-schema validation failure ({ fields })', async () => {
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.post).mockRejectedValue(axiosError(400, { success: false, message: 'invalid', data: { fields: { tenant: 'Invalid tenant id' } } }))

    const { doctorsService } = await import('./doctors.service')
    await expect(doctorsService.bulkCreateDoctors({ file: new File(['x'], 'a.csv') })).rejects.toThrow()
  })

  it('rejects (does not miscast) a 400 caused by a missing CSV file (data: null)', async () => {
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.post).mockRejectedValue(axiosError(400, { success: false, message: 'CSV file is required', data: null }))

    const { doctorsService } = await import('./doctors.service')
    await expect(doctorsService.bulkCreateDoctors({ file: new File(['x'], 'a.csv') })).rejects.toThrow()
  })
})
