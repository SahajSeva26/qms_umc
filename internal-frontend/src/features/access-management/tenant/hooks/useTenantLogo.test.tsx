import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useTenantLogo, tenantLogoKeys } from './useTenantLogo'

vi.mock('@/lib/file/file.service', () => ({
  fileService: {
    searchFiles: vi.fn(),
    getFile: vi.fn(),
  },
}))

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}

describe('useTenantLogo', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('is keyed as tenantLogoKeys.detail(tenantId)', () => {
    expect(tenantLogoKeys.detail('t-1')).toEqual(['tenants', 'logo', 't-1'])
  })

  it('two-call resolution: search finds an active logo id, then getFile resolves the presigned url', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    vi.mocked(fileService.searchFiles).mockResolvedValue({
      success: true,
      message: '',
      data: { count: 1, items: [{ id: 'file-1' }] },
    } as never)
    vi.mocked(fileService.getFile).mockResolvedValue({
      success: true,
      message: '',
      data: { id: 'file-1', url: 'https://s3.example.com/file-1?sig=abc' },
    } as never)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useTenantLogo('t-1'), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(fileService.searchFiles).toHaveBeenCalledWith({
      entityType: 'tenant',
      relation: 'logo',
      entityId: 't-1',
      status: 'active',
    })
    expect(fileService.getFile).toHaveBeenCalledWith('file-1')
    expect(result.current.fileId).toBe('file-1')
    expect(result.current.url).toBe('https://s3.example.com/file-1?sig=abc')
    expect(result.current.isError).toBe(false)
  })

  it('no active logo: search returns empty, getFile is never called, fileId/url are both null', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    vi.mocked(fileService.searchFiles).mockResolvedValue({
      success: true,
      message: '',
      data: { count: 0, items: [] },
    } as never)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useTenantLogo('t-1'), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(fileService.getFile).not.toHaveBeenCalled()
    expect(result.current.fileId).toBeNull()
    expect(result.current.url).toBeNull()
    expect(result.current.isError).toBe(false)
  })

  it('isLoading is true synchronously on mount, distinct from the eventual no-logo/error result', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    let resolveSearch: (v: unknown) => void = () => {}
    vi.mocked(fileService.searchFiles).mockReturnValue(
      new Promise((resolve) => {
        resolveSearch = resolve
      }) as never,
    )

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useTenantLogo('t-1'), { wrapper })

    // Still checking — must be surfaced as isLoading, not silently coalesced into "no logo".
    expect(result.current.isLoading).toBe(true)
    expect(result.current.isError).toBe(false)
    expect(result.current.fileId).toBeNull()

    resolveSearch({ success: true, message: '', data: { count: 0, items: [] } })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
  })

  it('isError is a real, distinct, surfaced state when search fails — not collapsed into "no logo"', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    vi.mocked(fileService.searchFiles).mockRejectedValue(new Error('network down'))

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useTenantLogo('t-1'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.isLoading).toBe(false)
    // Critically: a caller must be able to tell this apart from a confirmed "no logo exists" —
    // an undetected still-active old logo must never look the same as isError=false/fileId=null.
    expect(result.current.fileId).toBeNull()
  })

  it('isError is surfaced when the second call (getFile) fails, even though search itself succeeded', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    vi.mocked(fileService.searchFiles).mockResolvedValue({
      success: true,
      message: '',
      data: { count: 1, items: [{ id: 'file-1' }] },
    } as never)
    vi.mocked(fileService.getFile).mockRejectedValue(new Error('boom'))

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useTenantLogo('t-1'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.url).toBeNull()
  })

  it('is disabled (no fetch at all) when tenantId is empty', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useTenantLogo(''), { wrapper })
    expect(result.current.isLoading).toBe(false)
    expect(result.current.fileId).toBeNull()
  })

  it('uses staleTime:0 + refetchOnMount:"always" — refetches on every fresh mount even with cached data', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    vi.mocked(fileService.searchFiles).mockResolvedValue({
      success: true,
      message: '',
      data: { count: 0, items: [] },
    } as never)

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result: first, unmount } = renderHook(() => useTenantLogo('t-1'), { wrapper })
    await waitFor(() => expect(first.current.isLoading).toBe(false))
    expect(fileService.searchFiles).toHaveBeenCalledTimes(1)
    unmount()

    // Remount immediately — staleTime:0 + refetchOnMount:'always' must still refetch,
    // since a presigned url must never be served stale.
    const { result: second } = renderHook(() => useTenantLogo('t-1'), { wrapper })
    await waitFor(() => expect(fileService.searchFiles).toHaveBeenCalledTimes(2))
    expect(second.current).toBeDefined()
  })

  it('refetch() re-runs the two-call resolution on demand', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    vi.mocked(fileService.searchFiles).mockResolvedValue({
      success: true,
      message: '',
      data: { count: 0, items: [] },
    } as never)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useTenantLogo('t-1'), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(fileService.searchFiles).toHaveBeenCalledTimes(1)

    result.current.refetch()
    await waitFor(() => expect(fileService.searchFiles).toHaveBeenCalledTimes(2))
  })
})
