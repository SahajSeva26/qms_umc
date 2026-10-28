import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RateCampModal from './RateCampModal'
import { ratingService } from '@/features/rating/rating.service'
import type { RatingEntity } from '@/types/rating.types'

vi.mock('@/features/rating/rating.service', () => ({
  ratingService: {
    searchRatings: vi.fn(),
    myRatings: vi.fn(),
    getRating: vi.fn(),
    createRating: vi.fn(),
    updateRating: vi.fn(),
  },
}))

function ratingFixture(overrides: Partial<RatingEntity> = {}): RatingEntity {
  return {
    id: 'rating-1', camp: null, worker: null, ratedBy: null, tenant: null,
    onTime: 5, attire: 4, communication: 3, overall: 4,
    ratedAt: '2026-09-21T00:00:00.000Z', createdAt: '2026-09-21T00:00:00.000Z', updatedAt: '2026-09-21T00:00:00.000Z',
    ...overrides,
  }
}

function renderModal(props: Partial<React.ComponentProps<typeof RateCampModal>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onClose = vi.fn()
  render(
    <QueryClientProvider client={queryClient}>
      <RateCampModal open campId="camp-1" existing={null} onClose={onClose} {...props} />
    </QueryClientProvider>,
  )
  return { onClose }
}

describe('RateCampModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('disables Submit until all three grounds are scored', async () => {
    renderModal()
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
    vi.mocked(ratingService.createRating).mockResolvedValue({ success: true, message: '', data: ratingFixture() })
    const { onClose } = renderModal()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /on time 5 of 5/i }))
    await user.click(screen.getByRole('button', { name: /attire 4 of 5/i }))
    await user.click(screen.getByRole('button', { name: /communication 3 of 5/i }))
    await user.click(screen.getByRole('button', { name: /submit rating/i }))

    expect(ratingService.createRating).toHaveBeenCalledWith({ camp: 'camp-1', onTime: 5, attire: 4, communication: 3 })
    expect(onClose).toHaveBeenCalled()
  })

  it('pre-fills from an existing rating and calls update, not create, on save', async () => {
    vi.mocked(ratingService.updateRating).mockResolvedValue({ success: true, message: '', data: ratingFixture() })
    renderModal({ existing: ratingFixture({ id: 'rating-9', onTime: 5, attire: 4, communication: 3 }) })

    expect(screen.getByText('Edit rating')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /on time 5 of 5/i })).toHaveAttribute('aria-pressed', 'true')

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(ratingService.updateRating).toHaveBeenCalledWith('rating-9', { onTime: 5, attire: 4, communication: 3 })
    expect(ratingService.createRating).not.toHaveBeenCalled()
  })
})
