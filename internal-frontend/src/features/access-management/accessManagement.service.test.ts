import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AxiosError } from 'axios'

vi.mock('@/lib/api/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

function axiosError(status: number, data: unknown): AxiosError {
  const error = new Error('request failed') as AxiosError
  error.isAxiosError = true
  error.response = { status, data, statusText: '', headers: {}, config: {} as never }
  error.toJSON = () => ({})
  return error
}

describe('accessManagementService.bulkCreateTenants', () => {
  beforeEach(() => vi.resetAllMocks())

  it('posts the CSV as the backend file multipart field', async () => {
    const api = (await import('@/lib/api/api')).default
    const result = { totalRows: 1, created: 1, failed: 0, errors: [] }
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, message: '', data: result } })

    const { accessManagementService } = await import('./accessManagement.service')
    const file = new File(['name'], 'clients.csv', { type: 'text/csv' })
    await expect(accessManagementService.bulkCreateTenants(file)).resolves.toEqual(result)

    const [url, body] = vi.mocked(api.post).mock.calls[0]
    expect(url).toBe('/tenants/bulk')
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get('file')).toBe(file)
  })

  it('returns a partial result from the backend 400 because successful rows already committed', async () => {
    const api = (await import('@/lib/api/api')).default
    const result = { totalRows: 3, created: 2, failed: 1, errors: [{ row: 3, error: 'Email already exists' }] }
    vi.mocked(api.post).mockRejectedValue(axiosError(400, { success: false, message: 'Clients created with errors', data: result }))

    const { accessManagementService } = await import('./accessManagement.service')
    await expect(accessManagementService.bulkCreateTenants(new File(['x'], 'clients.csv'))).resolves.toEqual(result)
  })

  it('rejects an unrelated 400 rather than misrepresenting it as a partial import', async () => {
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.post).mockRejectedValue(axiosError(400, { success: false, message: 'CSV file is required', data: null }))

    const { accessManagementService } = await import('./accessManagement.service')
    await expect(accessManagementService.bulkCreateTenants(new File(['x'], 'clients.csv'))).rejects.toThrow()
  })
})
