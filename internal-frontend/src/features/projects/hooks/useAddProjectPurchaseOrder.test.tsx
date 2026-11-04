import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { projectsService } from '@/features/projects/projects.service'
import { useAddProjectPurchaseOrder } from './useAddProjectPurchaseOrder'

vi.mock('@/features/projects/projects.service', () => ({
  projectsService: {
    getProject: vi.fn(),
    updateProject: vi.fn(),
  },
}))

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>{children}</QueryClientProvider>
}

describe('useAddProjectPurchaseOrder', () => {
  beforeEach(() => vi.clearAllMocks())

  it('re-reads the project and appends without overwriting a PO added after the drawer loaded', async () => {
    vi.mocked(projectsService.getProject).mockResolvedValue({
      success: true,
      message: '',
      data: {
        executionMode: {
          mode: 'po',
          po: { purchaseOrders: [{ number: 'PO-LATEST', date: '2026-10-20' }] },
        },
      },
    } as never)
    vi.mocked(projectsService.updateProject).mockResolvedValue({ success: true, message: '', data: {} } as never)
    const { result } = renderHook(() => useAddProjectPurchaseOrder(), { wrapper })

    await act(() => result.current.mutateAsync({
      projectId: 'project-1',
      purchaseOrder: { number: 'PO-NEW', date: '2026-10-29' },
    }))

    expect(projectsService.getProject).toHaveBeenCalledWith('project-1')
    expect(projectsService.updateProject).toHaveBeenCalledWith('project-1', {
      executionMode: {
        mode: 'po',
        po: {
          purchaseOrders: [
            { number: 'PO-LATEST', date: '2026-10-20' },
            { number: 'PO-NEW', date: '2026-10-29' },
          ],
        },
      },
    })
  })

  it('does not overwrite execution mode if the project stopped being PO-based', async () => {
    vi.mocked(projectsService.getProject).mockResolvedValue({
      success: true,
      message: '',
      data: { executionMode: { mode: 'agreement' } },
    } as never)
    const { result } = renderHook(() => useAddProjectPurchaseOrder(), { wrapper })

    await expect(result.current.mutateAsync({
      projectId: 'project-1',
      purchaseOrder: { number: 'PO-NEW', date: '2026-10-29' },
    })).rejects.toThrow('no longer configured for purchase orders')
    expect(projectsService.updateProject).not.toHaveBeenCalled()
  })
})
