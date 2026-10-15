import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { useAnalyticsData } from '@/features/analytics/hooks/useAnalyticsData'
import AnalyticsPage from './AnalyticsPage'

vi.mock('@/features/analytics/hooks/useAnalyticsData')

function renderAtAnalyticsRoot() {
  return render(
    <MemoryRouter initialEntries={['/analytics']}>
      <Routes>
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/analytics/fo" element={<div>fo-analytics-route-marker</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AnalyticsPage — FO Performance tab', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(useAnalyticsData).mockReturnValue({
      clients: [], doctors: [], activeFOs: null, pnlTrend: { revenue: [], expense: [] }, arAging: [], expenseSplit: [],
      camps: [], projects: [], leads: [], invoices: [], isLoading: false, error: null,
    } as unknown as ReturnType<typeof useAnalyticsData>)
  })

  it('clicking "FO Performance" navigates to /analytics/fo instead of rendering inline', async () => {
    renderAtAnalyticsRoot()
    await userEvent.click(screen.getByRole('button', { name: 'FO Performance' }))

    expect(await screen.findByText('fo-analytics-route-marker')).toBeInTheDocument()
  })

  it('never renders FO leaderboard/region content inside the legacy mock shell, even after other tab clicks', async () => {
    renderAtAnalyticsRoot()
    await userEvent.click(screen.getByRole('button', { name: 'Sales & Pipeline' }))
    await userEvent.click(screen.getByRole('button', { name: 'Camps' }))

    expect(screen.queryByText('FO leaderboard')).not.toBeInTheDocument()
    expect(screen.queryByText('By region')).not.toBeInTheDocument()
  })
})
