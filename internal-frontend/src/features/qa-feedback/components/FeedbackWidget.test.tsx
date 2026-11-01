import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import FeedbackWidget from './FeedbackWidget'
import { useQaFeedback } from '@/features/qa-feedback/hooks/useQaFeedback'
import type { QaFeedbackEntity } from '@/types/qaFeedback.types'

vi.mock('@/features/qa-feedback/hooks/useQaFeedback')

// jsdom doesn't implement the Pointer Capture API the drag handlers call — stub it so a click
// on the draggable trigger button doesn't throw, same as real browsers which all support it.
if (!HTMLElement.prototype.setPointerCapture) {
  HTMLElement.prototype.setPointerCapture = () => {}
}

function feedbackFixture(overrides: Partial<QaFeedbackEntity> = {}): QaFeedbackEntity {
  return {
    id: 'fb-1', pageRoute: '/crm', pageTitle: 'CRM & Sales',
    pinXPercent: 40, pinYPercent: 60, comment: 'Button overlaps the header',
    issueKey: 'QF-123',
    reportedBy: { id: 'u-1', firstName: 'Test', lastName: 'User', email: 'tester@example.com' },
    status: 'open', resolutionNote: '',
    createdAt: '2026-09-01T10:00:00.000Z', updatedAt: '2026-09-01T10:00:00.000Z',
    ...overrides,
  }
}

function mockUseQaFeedback(items: QaFeedbackEntity[] = [], overrides: Partial<ReturnType<typeof useQaFeedback>> = {}) {
  const createFeedback = vi.fn().mockResolvedValue({ success: true, message: '', data: items[0] })
  vi.mocked(useQaFeedback).mockReturnValue({
    items, count: items.length, isLoading: false, error: null,
    createFeedback, updateFeedback: vi.fn(), isCreating: false, isUpdating: false,
    ...overrides,
  } as unknown as ReturnType<typeof useQaFeedback>)
  return { createFeedback }
}

async function renderWidget(initialPath = '/crm') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <FeedbackWidget />
    </MemoryRouter>,
  )
}

describe('FeedbackWidget', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows the trigger button idle, with no menu or ticket list yet', async () => {
    mockUseQaFeedback()
    await renderWidget()

    expect(screen.getByRole('button', { name: /flag issue/i })).toBeInTheDocument()
    expect(screen.queryByText('View tickets on this page')).not.toBeInTheDocument()
  })

  it('clicking the trigger opens a menu with "View tickets on this page" and "New ticket"', async () => {
    mockUseQaFeedback()
    const user = userEvent.setup()
    await renderWidget()

    await user.click(screen.getByRole('button', { name: /flag issue/i }))

    expect(screen.getByRole('button', { name: /view tickets on this page/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /new ticket/i })).toBeInTheDocument()
  })

  it('"New ticket" enters the existing pick-a-spot flow', async () => {
    mockUseQaFeedback()
    const user = userEvent.setup()
    await renderWidget()

    await user.click(screen.getByRole('button', { name: /flag issue/i }))
    await user.click(screen.getByRole('button', { name: /new ticket/i }))

    expect(screen.getByText(/click the exact spot you want to flag/i)).toBeInTheDocument()
  })

  it('does not query tickets while idle or while the menu is open', async () => {
    mockUseQaFeedback()
    const user = userEvent.setup()
    await renderWidget()

    expect(useQaFeedback).toHaveBeenLastCalledWith(expect.anything(), false)

    await user.click(screen.getByRole('button', { name: /flag issue/i }))
    expect(useQaFeedback).toHaveBeenLastCalledWith(expect.anything(), false)
  })

  it('"View tickets on this page" queries with an exact, anchored pageRoute filter and enables the query', async () => {
    mockUseQaFeedback([])
    const user = userEvent.setup()
    await renderWidget('/crm')

    await user.click(screen.getByRole('button', { name: /flag issue/i }))
    await user.click(screen.getByRole('button', { name: /view tickets on this page/i }))

    expect(useQaFeedback).toHaveBeenCalledWith({ pageRoute: '^/crm$', limit: '10', page: '1' }, true)
  })

  it('escapes regex special characters in the route so a dynamic segment never breaks the anchor match', async () => {
    mockUseQaFeedback([])
    const user = userEvent.setup()
    await renderWidget('/projects/abc.123')

    await user.click(screen.getByRole('button', { name: /flag issue/i }))
    await user.click(screen.getByRole('button', { name: /view tickets on this page/i }))

    expect(useQaFeedback).toHaveBeenCalledWith({ pageRoute: '^/projects/abc\\.123$', limit: '10', page: '1' }, true)
  })

  it('renders the page\'s own tickets as compact cards', async () => {
    mockUseQaFeedback([feedbackFixture({ comment: 'Specific bug on this page' })])
    const user = userEvent.setup()
    await renderWidget()

    await user.click(screen.getByRole('button', { name: /flag issue/i }))
    await user.click(screen.getByRole('button', { name: /view tickets on this page/i }))

    expect(screen.getByText('Specific bug on this page')).toBeInTheDocument()
  })

  it('shows the real server-side total count, not just the fetched page size, in the header', async () => {
    const tenItems = Array.from({ length: 10 }, (_, i) => feedbackFixture({ id: `fb-${i}` }))
    mockUseQaFeedback(tenItems, { count: 23 })
    const user = userEvent.setup()
    await renderWidget()

    await user.click(screen.getByRole('button', { name: /flag issue/i }))
    await user.click(screen.getByRole('button', { name: /view tickets on this page/i }))

    expect(screen.getByText('Tickets on this page (23)')).toBeInTheDocument()
  })

  it('renders pagination controls (not a silent cap) once a page has more tickets than the page size', async () => {
    const tenItems = Array.from({ length: 10 }, (_, i) => feedbackFixture({ id: `fb-${i}` }))
    mockUseQaFeedback(tenItems, { count: 23 })
    const user = userEvent.setup()
    await renderWidget()

    await user.click(screen.getByRole('button', { name: /flag issue/i }))
    await user.click(screen.getByRole('button', { name: /view tickets on this page/i }))

    expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next/i })).toBeEnabled()
  })

  it('does not render pagination controls when every ticket already fits on one page', async () => {
    mockUseQaFeedback([feedbackFixture()], { count: 1 })
    const user = userEvent.setup()
    await renderWidget()

    await user.click(screen.getByRole('button', { name: /flag issue/i }))
    await user.click(screen.getByRole('button', { name: /view tickets on this page/i }))

    expect(screen.queryByText(/page 1 of/i)).not.toBeInTheDocument()
  })

  it('clicking Next re-queries page 2 with the same pageRoute filter', async () => {
    const tenItems = Array.from({ length: 10 }, (_, i) => feedbackFixture({ id: `fb-${i}` }))
    mockUseQaFeedback(tenItems, { count: 23 })
    const user = userEvent.setup()
    await renderWidget('/crm')

    await user.click(screen.getByRole('button', { name: /flag issue/i }))
    await user.click(screen.getByRole('button', { name: /view tickets on this page/i }))
    await user.click(screen.getByRole('button', { name: /next/i }))

    expect(useQaFeedback).toHaveBeenCalledWith({ pageRoute: '^/crm$', limit: '10', page: '2' }, true)
  })

  it('reopening the ticket list after navigating starts back on page 1', async () => {
    mockUseQaFeedback([feedbackFixture()], { count: 1 })
    const user = userEvent.setup()
    await renderWidget()

    await user.click(screen.getByRole('button', { name: /flag issue/i }))
    await user.click(screen.getByRole('button', { name: /view tickets on this page/i }))
    await user.click(screen.getByRole('button', { name: /close/i }))

    await user.click(screen.getByRole('button', { name: /flag issue/i }))
    await user.click(screen.getByRole('button', { name: /view tickets on this page/i }))

    expect(useQaFeedback).toHaveBeenCalledWith({ pageRoute: '^/crm$', limit: '10', page: '1' }, true)
  })

  it('shows an empty state when no tickets exist for this page', async () => {
    mockUseQaFeedback([])
    const user = userEvent.setup()
    await renderWidget()

    await user.click(screen.getByRole('button', { name: /flag issue/i }))
    await user.click(screen.getByRole('button', { name: /view tickets on this page/i }))

    expect(screen.getByText(/no tickets raised on this page yet/i)).toBeInTheDocument()
  })

  it('shows a failure state, not a false empty state, when the page-ticket fetch errors', async () => {
    mockUseQaFeedback([], { error: new Error('fail') })
    const user = userEvent.setup()
    await renderWidget()

    await user.click(screen.getByRole('button', { name: /flag issue/i }))
    await user.click(screen.getByRole('button', { name: /view tickets on this page/i }))

    expect(screen.getByText(/failed to load tickets/i)).toBeInTheDocument()
    expect(screen.queryByText(/no tickets raised/i)).not.toBeInTheDocument()
  })

  it('closing the ticket list returns to idle', async () => {
    mockUseQaFeedback([])
    const user = userEvent.setup()
    await renderWidget()

    await user.click(screen.getByRole('button', { name: /flag issue/i }))
    await user.click(screen.getByRole('button', { name: /view tickets on this page/i }))
    await user.click(screen.getByRole('button', { name: /close/i }))

    expect(screen.getByRole('button', { name: /flag issue/i })).toBeInTheDocument()
    expect(screen.queryByText(/tickets on this page/i)).not.toBeInTheDocument()
  })

  it('still submits a new ticket end-to-end (existing create flow unaffected)', async () => {
    const { createFeedback } = mockUseQaFeedback()
    const user = userEvent.setup()
    await renderWidget('/crm')

    await user.click(screen.getByRole('button', { name: /flag issue/i }))
    await user.click(screen.getByRole('button', { name: /new ticket/i }))
    await user.click(screen.getByTestId('feedback-pick-surface'))
    await user.type(screen.getByPlaceholderText(/what's wrong here/i), 'Something is broken')
    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(createFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ pageRoute: '/crm', comment: 'Something is broken' }),
    )
  })
})
