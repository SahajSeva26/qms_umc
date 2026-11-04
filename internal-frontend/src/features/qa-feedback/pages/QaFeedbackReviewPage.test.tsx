import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useQaFeedback } from '@/features/qa-feedback/hooks/useQaFeedback'
import QaFeedbackReviewPage from './QaFeedbackReviewPage'
import type { QaFeedbackEntity } from '@/types/qaFeedback.types'

vi.mock('@/features/qa-feedback/hooks/useQaFeedback')

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

function mockUseQaFeedback(items: QaFeedbackEntity[], overrides: Partial<ReturnType<typeof useQaFeedback>> = {}) {
  const updateFeedback = vi.fn().mockResolvedValue({ success: true, message: '', data: items[0] })
  vi.mocked(useQaFeedback).mockReturnValue({
    items, count: items.length, isLoading: false, error: null,
    createFeedback: vi.fn(), updateFeedback, isCreating: false, isUpdating: false,
    ...overrides,
  } as unknown as ReturnType<typeof useQaFeedback>)
  return { updateFeedback }
}

describe('QaFeedbackReviewPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders the real Jira status text for a non-open, Jira-driven status instead of a miscategorized OPEN badge', () => {
    mockUseQaFeedback([feedbackFixture({ status: 'In Progress' })])

    render(<QaFeedbackReviewPage />)

    expect(screen.getByText('IN PROGRESS')).toBeInTheDocument()
    expect(screen.queryByText('OPEN')).not.toBeInTheDocument()
  })

  it('renders a working "View in Jira" link built from the real issueKey', () => {
    mockUseQaFeedback([feedbackFixture({ issueKey: 'QF-456' })])

    render(<QaFeedbackReviewPage />)

    const link = screen.getByRole('link', { name: /QF-456/i })
    expect(link).toHaveAttribute('href', 'https://sahajseva.atlassian.net/browse/QF-456')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('no longer shows a "Mark resolved" or "Reopen" status-mutating action', () => {
    mockUseQaFeedback([feedbackFixture()])

    render(<QaFeedbackReviewPage />)

    expect(screen.queryByRole('button', { name: /mark resolved/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reopen/i })).not.toBeInTheDocument()
  })

  it('Save note calls updateFeedback with only resolutionNote in the payload, never status', async () => {
    const { updateFeedback } = mockUseQaFeedback([feedbackFixture()])
    const user = userEvent.setup()

    render(<QaFeedbackReviewPage />)

    await user.click(screen.getByRole('button', { name: /add note/i }))
    const textarea = screen.getByPlaceholderText(/fixed in commit/i)
    await user.type(textarea, 'Fixed in commit abc123')
    await user.click(screen.getByRole('button', { name: /save note/i }))

    expect(updateFeedback).toHaveBeenCalledTimes(1)
    const [id, payload] = updateFeedback.mock.calls[0]
    expect(id).toBe('fb-1')
    expect(payload).toEqual({ resolutionNote: 'Fixed in commit abc123' })
  })

  it('the tab bar only offers Open and All — no third "Resolved" tab', () => {
    mockUseQaFeedback([])

    render(<QaFeedbackReviewPage />)

    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Resolved' })).not.toBeInTheDocument()
  })

  it('switching to All re-queries with no status filter', async () => {
    mockUseQaFeedback([])
    const user = userEvent.setup()

    render(<QaFeedbackReviewPage />)
    expect(useQaFeedback).toHaveBeenLastCalledWith({ status: 'open' })

    await user.click(screen.getByRole('button', { name: 'All' }))
    expect(useQaFeedback).toHaveBeenLastCalledWith({})
  })
})
