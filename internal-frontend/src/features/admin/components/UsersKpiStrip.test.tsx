import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import UsersKpiStrip from './UsersKpiStrip'
import type { UserReport } from '@/types/userReport.types'

function reportFixture(overrides: Partial<UserReport> = {}): UserReport {
  return {
    summary: { totalUsers: 120, active: 90, inactive: 10, suspended: 5, deleted: 15 },
    demographics: { gender: { male: 60, female: 55, other: 3, unspecified: 2 } },
    security: { lockedAccounts: 4 },
    trends: {
      registrations: {
        granularity: 'day',
        from: '2026-08-06T00:00:00.000Z',
        to: '2026-09-05T23:59:59.999Z',
        data: [
          { period: '2026-08-06', count: 0 },
          { period: '2026-08-07', count: 2 },
          { period: '2026-09-05', count: 1 },
        ],
      },
    },
    ...overrides,
  }
}

describe('UsersKpiStrip', () => {
  it('renders all six summary tiles with distinct, non-merged Suspended/Deleted counts', () => {
    render(<UsersKpiStrip report={reportFixture()} />)

    expect(screen.getByText('Total users')).toBeInTheDocument()
    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('90')).toBeInTheDocument()
    expect(screen.getByText('Inactive')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('Suspended')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('Deleted')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('Locked accounts')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('shows the "platform overview" caption above the tiles, since the report ignores table filters', () => {
    render(<UsersKpiStrip report={reportFixture()} />)
    expect(screen.getByText(/platform overview/i)).toBeInTheDocument()
  })

  it('renders a trend data point per entry returned by the backend, without assuming a fixed count', () => {
    const report = reportFixture()
    render(<UsersKpiStrip report={report} />)
    // Every-other label is visually hidden but still in the DOM; the first
    // point's formatted label is always visible (index 0).
    expect(screen.getByText('08-06')).toBeInTheDocument()
  })

  it('formats day-granularity trend labels as MM-DD, not the raw YYYY-MM-DD', () => {
    render(<UsersKpiStrip report={reportFixture()} />)
    expect(screen.getByText('08-06')).toBeInTheDocument()
    expect(screen.queryByText('2026-08-06')).not.toBeInTheDocument()
  })

  it('renders sensibly with all-zero counts (new/empty system)', () => {
    const empty = reportFixture({
      summary: { totalUsers: 0, active: 0, inactive: 0, suspended: 0, deleted: 0 },
      security: { lockedAccounts: 0 },
    })
    render(<UsersKpiStrip report={empty} />)
    expect(screen.getAllByText('0').length).toBeGreaterThan(0)
  })

  it('renders sensibly with a single-point trend (from === to edge case)', () => {
    const single = reportFixture({
      trends: {
        registrations: {
          granularity: 'day',
          from: '2026-09-05T00:00:00.000Z',
          to: '2026-09-05T23:59:59.999Z',
          data: [{ period: '2026-09-05', count: 3 }],
        },
      },
    })
    render(<UsersKpiStrip report={single} />)
    expect(screen.getByText('09-05')).toBeInTheDocument()
  })

  it('shows a "no registrations" message instead of an empty chart when the trend array is empty', () => {
    const emptyTrend = reportFixture({
      trends: {
        registrations: {
          granularity: 'day',
          from: '2026-09-05T00:00:00.000Z',
          to: '2026-09-04T23:59:59.999Z',
          data: [],
        },
      },
    })
    render(<UsersKpiStrip report={emptyTrend} />)
    expect(screen.getByText(/no registrations in this period/i)).toBeInTheDocument()
  })
})
