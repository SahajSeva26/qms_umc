import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AxiosInstance } from 'axios'
import type { RatingEntity } from '@qms/core'
import CampRatingSection, { type CampRatingAccess } from './CampRatingSection'

function makeApi(): AxiosInstance {
  return { get: vi.fn(), post: vi.fn(), put: vi.fn() } as unknown as AxiosInstance
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function ratingFixture(overrides: Partial<RatingEntity> = {}): RatingEntity {
  return {
    id: 'rating-1', camp: null, worker: null, ratedBy: null, tenant: null,
    onTime: 5, attire: 4, communication: 3, overall: 4,
    ratedAt: '2026-09-21T00:00:00.000Z', createdAt: '2026-09-21T00:00:00.000Z', updatedAt: '2026-09-21T00:00:00.000Z',
    ...overrides,
  }
}

function searchResponse(items: RatingEntity[]) {
  return { data: { success: true, message: '', data: { items, count: items.length } } }
}

const fullAccess: CampRatingAccess = { canSearch: true, canReadOwn: false, canCreate: false, canUpdate: false }

function renderSection(api: AxiosInstance, props: Partial<React.ComponentProps<typeof CampRatingSection>> = {}) {
  const toast = { success: vi.fn(), error: vi.fn() }
  const getErrorMessage = vi.fn((_err: unknown, fallback: string) => fallback)
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <CampRatingSection
        campId="camp-1"
        ratingAccess={fullAccess}
        api={api}
        toast={toast}
        getErrorMessage={getErrorMessage}
        wrapper={(children) => <div data-testid="wrapper">{children}</div>}
        {...props}
      />
    </QueryClientProvider>,
  )
}

describe('CampRatingSection — canSearch flow', () => {
  let api: AxiosInstance

  beforeEach(() => {
    api = makeApi()
  })

  it('renders nothing and makes ZERO rating requests when the viewer has no search, read-own, or create capability', () => {
    const { container } = renderSection(api, { ratingAccess: { canSearch: false, canReadOwn: false, canCreate: false, canUpdate: false } })

    expect(container).toBeEmptyDOMElement()
    expect(api.get).not.toHaveBeenCalled()
  })

  it('renders nothing when the viewer cannot create a rating, none exists yet, and there is no error', async () => {
    vi.mocked(api.get).mockResolvedValue(searchResponse([]))
    const { container } = renderSection(api, { ratingAccess: { ...fullAccess, canCreate: false } })

    await waitFor(() => expect(api.get).toHaveBeenCalled())
    expect(container.querySelector('[data-testid="wrapper"]')).not.toBeInTheDocument()
  })

  it('shows the Rate button when canCreate is true and no rating exists yet', async () => {
    vi.mocked(api.get).mockResolvedValue(searchResponse([]))
    renderSection(api, { ratingAccess: { ...fullAccess, canCreate: true } })

    expect(await screen.findByRole('button', { name: /rate camp/i })).toBeInTheDocument()
  })

  it('shows the read-only display (and no edit button) when canUpdate is false, even if canCreate is true', async () => {
    vi.mocked(api.get).mockResolvedValue(searchResponse([ratingFixture()]))
    renderSection(api, { ratingAccess: { ...fullAccess, canCreate: true, canUpdate: false } })

    expect(await screen.findByText('Overall')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit rating/i })).not.toBeInTheDocument()
  })

  it('shows the display plus an Edit button when a rating exists and canUpdate is true — Edit is gated on canUpdate, never canCreate', async () => {
    vi.mocked(api.get).mockResolvedValue(searchResponse([ratingFixture()]))
    renderSection(api, { ratingAccess: { ...fullAccess, canCreate: false, canUpdate: true } })

    expect(await screen.findByText('Overall')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit rating/i })).toBeInTheDocument()
  })

  it('shows a retryable error state when the ratings query fails', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('network error'))
    renderSection(api, { ratingAccess: { ...fullAccess, canCreate: true } })

    expect(await screen.findByText(/couldn't load this camp's rating/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('calls GET /ratings (search), not GET /ratings/me, when canSearch is true', async () => {
    vi.mocked(api.get).mockResolvedValue(searchResponse([]))
    renderSection(api, { ratingAccess: { ...fullAccess, canCreate: true } })

    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/ratings', expect.anything()))
    expect(api.get).not.toHaveBeenCalledWith('/ratings/me', expect.anything())
  })

  it('clicking Rate camp opens the modal, which is lazy-loaded (mounts only after click)', async () => {
    vi.mocked(api.get).mockResolvedValue(searchResponse([]))
    const user = userEvent.setup()
    renderSection(api, { ratingAccess: { ...fullAccess, canCreate: true } })

    const rateButton = await screen.findByRole('button', { name: /rate camp/i })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(rateButton)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })
})

describe('CampRatingSection — canReadOwn flow (read-own without broad search)', () => {
  let api: AxiosInstance

  beforeEach(() => {
    api = makeApi()
  })

  it('queries GET /ratings/me, not GET /ratings (search), when canSearch is false and canReadOwn is true', async () => {
    vi.mocked(api.get).mockResolvedValue(searchResponse([]))
    renderSection(api, { ratingAccess: { canSearch: false, canReadOwn: true, canCreate: true, canUpdate: false } })

    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/ratings/me', expect.anything()))
    expect(api.get).not.toHaveBeenCalledWith('/ratings', expect.anything())
  })

  it('shows the viewer\'s own existing rating from GET /ratings/me', async () => {
    vi.mocked(api.get).mockResolvedValue(searchResponse([ratingFixture()]))
    renderSection(api, { ratingAccess: { canSearch: false, canReadOwn: true, canCreate: false, canUpdate: false } })

    expect(await screen.findByText('Overall')).toBeInTheDocument()
  })
})

describe('CampRatingSection — create-only flow (no read capability at all)', () => {
  let api: AxiosInstance

  beforeEach(() => {
    api = makeApi()
  })

  it('shows Rate camp immediately with NO GET request before opening, when the viewer can only create', () => {
    renderSection(api, { ratingAccess: { canSearch: false, canReadOwn: false, canCreate: true, canUpdate: false } })

    expect(screen.getByRole('button', { name: /rate camp/i })).toBeInTheDocument()
    expect(api.get).not.toHaveBeenCalled()
  })

  it('surfaces the backend\'s own 409 message durably (not just a toast) when a create-only viewer hits "already rated"', async () => {
    const conflictError = Object.assign(new Error('Conflict'), {
      isAxiosError: true,
      response: { status: 409, data: { message: 'You have already rated this worker for this camp' } },
    })
    vi.mocked(api.post).mockRejectedValue(conflictError)
    const user = userEvent.setup()
    const toast = { success: vi.fn(), error: vi.fn() }
    const getErrorMessage = (err: unknown, fallback: string) =>
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <CampRatingSection
          campId="camp-1"
          ratingAccess={{ canSearch: false, canReadOwn: false, canCreate: true, canUpdate: false }}
          api={api}
          toast={toast}
          getErrorMessage={getErrorMessage}
          wrapper={(children) => <div>{children}</div>}
        />
      </QueryClientProvider>,
    )

    await user.click(screen.getByRole('button', { name: /rate camp/i }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByLabelText('On time 5 of 5'))
    await user.click(within(dialog).getByLabelText('Attire 5 of 5'))
    await user.click(within(dialog).getByLabelText('Communication 5 of 5'))
    await user.click(within(dialog).getByRole('button', { name: /submit rating/i }))

    expect(await screen.findByText('You have already rated this worker for this camp')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
