import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'

vi.mock('@/features/test-master/test.service', () => ({
  testService: {
    searchTests: vi.fn(),
    getTest: vi.fn(),
    createTest: vi.fn(),
    updateTest: vi.fn(),
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderModal(testId: string | null) {
  const EditTestModal = (await import('./EditTestModal')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <EditTestModal testId={testId} onClose={vi.fn()} />
    </QueryClientProvider>,
  )
}

describe('EditTestModal', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('fires zero GET /test-masters/:id calls and renders the form immediately in create mode', async () => {
    const { testService } = await import('@/features/test-master/test.service')

    await renderModal(null)

    expect(await screen.findByRole('button', { name: /create test/i })).toBeInTheDocument()
    expect(testService.getTest).not.toHaveBeenCalled()
  })

  it('fetches exactly once and withholds the form until the detail query resolves', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.getTest).mockResolvedValue({
      success: true,
      message: '',
      data: { id: 't-1', code: 'tst-000001', name: 'ECG', therapy: 'cardiology', campType: 'screening', duration: 15, price: 250, status: 'active', consumption: [] },
    } as never)

    await renderModal('t-1')

    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /save changes/i })).toBeInTheDocument()
    expect(testService.getTest).toHaveBeenCalledTimes(1)
  })

  it('shows a retry-able error state instead of the form when the detail fetch fails', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.getTest).mockRejectedValue(new Error('network error'))

    await renderModal('t-1')

    expect(await screen.findByText(/failed to load test/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument()
  })
})
