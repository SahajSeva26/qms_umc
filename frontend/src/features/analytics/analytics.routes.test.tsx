import type React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { useAnalyticsData } from '@/features/analytics/hooks/useAnalyticsData'
import { analyticsRoutes, ANALYTICS_ROUTES } from './analytics.routes'

vi.mock('@/features/analytics/hooks/useAnalyticsData')
vi.mock('@/lib/api/api', () => ({
  default: { get: vi.fn() },
}))

// Exercises the real lazy() loader each route is registered with, same pattern as
// camps.routes.test.tsx — so this can't silently drift from analytics.routes.tsx.
async function resolveAndRender(routePath: string) {
  const route = analyticsRoutes.find((r) => r.path === routePath)
  if (!route?.lazy) throw new Error(`No lazy route registered for ${routePath}`)
  const lazyFn = route.lazy as () => Promise<{ Component?: React.ComponentType }>
  const { Component } = await lazyFn()
  if (!Component) throw new Error(`Route loader for ${routePath} returned no Component`)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[routePath]}>
        <Routes>
          <Route path={routePath} element={<Component />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('analytics.routes.tsx — /analytics/fo, /analytics/sales, and /analytics/financial do not run the legacy mock analytics shell', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    vi.mocked(useAnalyticsData).mockReturnValue({
      clients: [], doctors: [], activeFOs: null, pnlTrend: [], arAging: [], expenseSplit: [],
      camps: [], projects: [], leads: [], invoices: [], isLoading: false, error: null,
    } as unknown as ReturnType<typeof useAnalyticsData>)
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, message: '', data: { count: 0, items: [] } } })
  })

  it('/analytics/fo never invokes useAnalyticsData (the mock-driven shared shell)', async () => {
    await resolveAndRender(ANALYTICS_ROUTES.ANALYTICS_FO)
    expect(useAnalyticsData).not.toHaveBeenCalled()
  })

  it('/analytics/sales never invokes useAnalyticsData (the mock-driven shared shell)', async () => {
    await resolveAndRender(ANALYTICS_ROUTES.ANALYTICS_SALES)
    expect(useAnalyticsData).not.toHaveBeenCalled()
  })

  it('/analytics/financial never invokes useAnalyticsData (the mock-driven shared shell)', async () => {
    await resolveAndRender(ANALYTICS_ROUTES.ANALYTICS_FINANCIAL)
    expect(useAnalyticsData).not.toHaveBeenCalled()
  })

  it('/analytics/doctors (still legacy, out of this task\'s scope) DOES invoke useAnalyticsData — confirms the mock above is meaningfully differentiating, not vacuously true', async () => {
    await resolveAndRender(ANALYTICS_ROUTES.ANALYTICS_DOCTORS)
    expect(useAnalyticsData).toHaveBeenCalled()
  })
})
