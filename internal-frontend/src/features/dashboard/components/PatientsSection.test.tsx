import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData'
import type { DashboardData } from '@/types/dashboard.types'

vi.mock('@/features/dashboard/hooks/useDashboardData')

const BASE_DATA = {
  headline: [], company: {}, project: {}, fo: {}, sales: {}, accounts: {}, doctors: {},
  hasLoadError: false,
} as unknown as DashboardData

function mockPatients(patients: DashboardData['patients']) {
  vi.mocked(useDashboardData).mockReturnValue({
    data: { ...BASE_DATA, patients },
  } as unknown as ReturnType<typeof useDashboardData>)
}

describe('PatientsSection — gender donut rendering guard', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders the donut when every gender has a real value AND a real share', async () => {
    mockPatients({
      total: { v: 10 },
      male: { v: 6, share: 60 },
      female: { v: 4, share: 40 },
      other: { v: 0, share: 0 },
      interpretations: [],
    })

    const PatientsSection = (await import('./PatientsSection')).default
    render(<PatientsSection />)

    // The donut's own gender legend rendered (not the "Live data not available" fallback) — the
    // page's unrelated "Interpretations by project" block always shows that fallback regardless
    // (no real source exists for it), so this only asserts the donut section specifically.
    expect(screen.getByText('Male', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getAllByText('Live data not available').length).toBe(1)
  })

  it('falls back to the empty state when a gender has a real value but a null share (e.g. the total-count request failed while gender requests succeeded)', async () => {
    mockPatients({
      total: { v: null }, // simulates the total request having failed
      male: { v: 6, share: null },
      female: { v: 4, share: null },
      other: { v: 0, share: null },
      interpretations: [],
    })

    const PatientsSection = (await import('./PatientsSection')).default
    render(<PatientsSection />)

    // Must not crash (GenderDonut's arc math would divide null/100 -> NaN) and must not render a
    // donut built on incomplete shares — both the donut's own fallback and the always-present
    // "Interpretations by project" fallback should be showing.
    expect(screen.getAllByText('Live data not available').length).toBe(2)
  })

  it('falls back to the empty state for a genuinely empty registry (total===0, every share computed as null)', async () => {
    mockPatients({
      total: { v: 0 },
      male: { v: 0, share: null },
      female: { v: 0, share: null },
      other: { v: 0, share: null },
      interpretations: [],
    })

    const PatientsSection = (await import('./PatientsSection')).default
    render(<PatientsSection />)

    expect(screen.getAllByText('Live data not available').length).toBe(2)
  })
})
