import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AxiosInstance } from 'axios'
import type { RatingEntity } from '@qms/core'
import RateCampModal from './RateCampModal'

function makeApi(): AxiosInstance {
  return { post: vi.fn(), put: vi.fn() } as unknown as AxiosInstance
}

function ratingFixture(overrides: Partial<RatingEntity> = {}): RatingEntity {
  return {
    id: 'rating-1', camp: null, worker: null, ratedBy: null, tenant: null,
    onTime: 5, attire: 4, communication: 3, overall: 4,
    ratedAt: '2026-09-21T00:00:00.000Z', createdAt: '2026-09-21T00:00:00.000Z', updatedAt: '2026-09-21T00:00:00.000Z',
    ...overrides,
  }
}

function renderModal(api: AxiosInstance, props: Partial<React.ComponentProps<typeof RateCampModal>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onClose = vi.fn()
  const toast = { success: vi.fn(), error: vi.fn() }
  const getErrorMessage = vi.fn((_err: unknown, fallback: string) => fallback)
  render(
    <QueryClientProvider client={queryClient}>
      <RateCampModal open campId="camp-1" existing={null} onClose={onClose} api={api} toast={toast} getErrorMessage={getErrorMessage} {...props} />
    </QueryClientProvider>,
  )
  return { onClose, toast }
}

describe('RateCampModal', () => {
  let api: AxiosInstance

  beforeEach(() => {
    api = makeApi()
  })

  it('disables Submit until all three grounds are scored', async () => {
    renderModal(api)
    const submit = screen.getByRole('button', { name: /submit rating/i })
    expect(submit).toBeDisabled()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /on time 4 of 5/i }))
    await user.click(screen.getByRole('button', { name: /attire 4 of 5/i }))
    expect(submit).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /communication 4 of 5/i }))
    expect(submit).not.toBeDisabled()
  })

  it('submits a create payload with the camp id and chosen scores', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, message: '', data: ratingFixture() } })
    const { onClose } = renderModal(api)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /on time 5 of 5/i }))
    await user.click(screen.getByRole('button', { name: /attire 4 of 5/i }))
    await user.click(screen.getByRole('button', { name: /communication 3 of 5/i }))
    await user.click(screen.getByRole('button', { name: /submit rating/i }))

    expect(api.post).toHaveBeenCalledWith('/ratings', { camp: 'camp-1', onTime: 5, attire: 4, communication: 3 })
    expect(onClose).toHaveBeenCalled()
  })

  it('pre-fills from an existing rating and calls update (PUT), not create, on save', async () => {
    vi.mocked(api.put).mockResolvedValue({ data: { success: true, message: '', data: ratingFixture() } })
    renderModal(api, { existing: ratingFixture({ id: 'rating-9', onTime: 5, attire: 4, communication: 3 }) })

    expect(screen.getByText('Edit rating')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /on time 5 of 5/i })).toHaveAttribute('aria-pressed', 'true')

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(api.put).toHaveBeenCalledWith('/ratings/rating-9', { onTime: 5, attire: 4, communication: 3 })
    expect(api.post).not.toHaveBeenCalled()
  })

  describe('onCreateConflict — create-only callers with no read capability', () => {
    function conflictError() {
      return Object.assign(new Error('Conflict'), {
        isAxiosError: true,
        response: { status: 409, data: { message: 'You have already rated this worker for this camp' } },
      })
    }

    it('calls onCreateConflict with the backend message and closes, on a genuine 409', async () => {
      vi.mocked(api.post).mockRejectedValue(conflictError())
      const onCreateConflict = vi.fn()
      const getErrorMessage = (err: unknown, fallback: string) =>
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
      const { onClose } = renderModal(api, { onCreateConflict, getErrorMessage })
      const user = userEvent.setup()

      await user.click(screen.getByRole('button', { name: /on time 5 of 5/i }))
      await user.click(screen.getByRole('button', { name: /attire 5 of 5/i }))
      await user.click(screen.getByRole('button', { name: /communication 5 of 5/i }))
      await user.click(screen.getByRole('button', { name: /submit rating/i }))

      await waitFor(() => expect(onCreateConflict).toHaveBeenCalledWith('You have already rated this worker for this camp'))
      expect(onClose).toHaveBeenCalled()
    })

    it('does NOT call onCreateConflict for an update (existing is set) even on a 409', async () => {
      vi.mocked(api.put).mockRejectedValue(conflictError())
      const onCreateConflict = vi.fn()
      renderModal(api, { existing: ratingFixture(), onCreateConflict })
      const user = userEvent.setup()

      await user.click(screen.getByRole('button', { name: /save changes/i }))
      await waitFor(() => expect(api.put).toHaveBeenCalled())

      expect(onCreateConflict).not.toHaveBeenCalled()
    })

    it('does NOT call onCreateConflict and keeps the submit retryable for a non-409 failure (e.g. network error)', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('network error'))
      const onCreateConflict = vi.fn()
      const { onClose } = renderModal(api, { onCreateConflict })
      const user = userEvent.setup()

      await user.click(screen.getByRole('button', { name: /on time 5 of 5/i }))
      await user.click(screen.getByRole('button', { name: /attire 5 of 5/i }))
      await user.click(screen.getByRole('button', { name: /communication 5 of 5/i }))
      await user.click(screen.getByRole('button', { name: /submit rating/i }))

      await waitFor(() => expect(api.post).toHaveBeenCalled())
      expect(onCreateConflict).not.toHaveBeenCalled()
      expect(onClose).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: /submit rating/i })).toBeInTheDocument()
    })
  })
})
