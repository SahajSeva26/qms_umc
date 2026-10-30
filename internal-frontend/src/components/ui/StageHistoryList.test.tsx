import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StageHistoryList from '@/components/ui/StageHistoryList'

describe('StageHistoryList', () => {
  it('renders "from → to" when from is present', () => {
    render(
      <StageHistoryList
        entries={[{ from: 'new', to: 'active', actor: { name: 'Alice' }, at: '2026-01-01T00:00:00.000Z' }]}
      />,
    )
    expect(screen.getByText('new')).toBeInTheDocument()
    expect(screen.getByText('→', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
  })

  it('renders just "to" with no leading arrow when from is omitted', () => {
    render(
      <StageHistoryList entries={[{ to: 'active', actor: { name: 'Alice' }, at: '2026-01-01T00:00:00.000Z' }]} />,
    )
    expect(screen.getByText('active')).toBeInTheDocument()
    expect(screen.queryByText('→', { exact: false })).not.toBeInTheDocument()
  })

  it('renders the reason as an italicized quote when present, omits it otherwise', () => {
    const { rerender } = render(
      <StageHistoryList
        entries={[{ to: 'active', reason: 'Approved by lead', actor: { name: 'Alice' }, at: '2026-01-01T00:00:00.000Z' }]}
      />,
    )
    expect(screen.getByText('“Approved by lead”')).toBeInTheDocument()

    rerender(
      <StageHistoryList entries={[{ to: 'active', actor: { name: 'Alice' }, at: '2026-01-01T00:00:00.000Z' }]} />,
    )
    expect(screen.queryByText(/“.*”/)).not.toBeInTheDocument()
  })

  it('falls back to "Unknown actor" when actor is null', () => {
    render(<StageHistoryList entries={[{ to: 'active', actor: null, at: '2026-01-01T00:00:00.000Z' }]} />)
    expect(screen.getByText(/Unknown actor/)).toBeInTheDocument()
  })

  it('renders a populated actor by name/email/roleId fallback order, and the date via toLocaleString', () => {
    const at = '2026-01-01T00:00:00.000Z'
    render(<StageHistoryList entries={[{ to: 'active', actor: { name: 'Alice', email: 'a@x.com' }, at }]} />)
    expect(screen.getByText(new RegExp(`Alice.*${new Date(at).toLocaleString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))).toBeInTheDocument()
  })
})
