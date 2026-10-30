import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FoAssignmentsWeekGrid from './FoAssignmentsWeekGrid'
import { useFoWeekCamps } from '@/features/fo/hooks/useFoWeekCamps'
import type { RoleEntity } from '@/types/accessManagement.types'
import type { CampEntity } from '@/types/campReal.types'
import type { GeoProfileEntity } from '@/types/geoProfile.types'

vi.mock('@/features/fo/hooks/useFoWeekCamps')

// Guarantees fake timers never bleed into the next test even if an assertion throws first.
afterEach(() => {
  vi.useRealTimers()
})

const EMPTY_GEO: Map<string, GeoProfileEntity> = new Map()

function roleFixture(overrides: Partial<RoleEntity> = {}): RoleEntity {
  return {
    id: 'role-1', name: 'Fallback Name', status: 'active',
    user: { firstName: 'Jane', lastName: 'FO', email: 'jane@fo.test' },
    tenant: 't-1', type: 'rt-1', permissions: [], createdAt: '', updatedAt: '',
    ...overrides,
  } as unknown as RoleEntity
}

function campFixture(overrides: Partial<CampEntity> = {}): CampEntity {
  return {
    id: 'camp-1', code: 'cmp-000001', type: 'screening', status: 'confirmed',
    date: new Date().toISOString(), location: { city: 'Mumbai' },
    ...overrides,
  } as unknown as CampEntity
}

describe('FoAssignmentsWeekGrid', () => {
  it('renders the week header row and FO column', () => {
    vi.mocked(useFoWeekCamps).mockReturnValue({})
    render(<FoAssignmentsWeekGrid roles={[roleFixture()]} geoByRole={EMPTY_GEO} onOpen={vi.fn()} />)

    expect(screen.getByText('FO')).toBeInTheDocument()
    expect(screen.getByText('This week')).toBeInTheDocument()
    expect(screen.getByText('Jane FO')).toBeInTheDocument()
  })

  it('shows the empty state when there are no FOs', () => {
    vi.mocked(useFoWeekCamps).mockReturnValue({})
    render(<FoAssignmentsWeekGrid roles={[]} geoByRole={EMPTY_GEO} onOpen={vi.fn()} />)

    expect(screen.getByText(/no fos match/i)).toBeInTheDocument()
  })

  it("renders today's camp code on the matching day cell", () => {
    const todayCamp = campFixture({ date: new Date().toISOString() })
    vi.mocked(useFoWeekCamps).mockReturnValue({
      'role-1': { camps: [todayCamp], isLoading: false, error: null, refetch: vi.fn(), truncated: false },
    })
    render(<FoAssignmentsWeekGrid roles={[roleFixture()]} geoByRole={EMPTY_GEO} onOpen={vi.fn()} />)

    expect(screen.getByText('cmp-000001 · Screening')).toBeInTheDocument()
  })

  it('renders the camp as a real keyboard-activatable button, not an inert div', () => {
    const todayCamp = campFixture({ date: new Date().toISOString() })
    vi.mocked(useFoWeekCamps).mockReturnValue({
      'role-1': { camps: [todayCamp], isLoading: false, error: null, refetch: vi.fn(), truncated: false },
    })
    render(<FoAssignmentsWeekGrid roles={[roleFixture()]} geoByRole={EMPTY_GEO} onOpen={vi.fn()} />)

    expect(screen.getByRole('button', { name: /open jane fo — camp cmp-000001/i })).toBeInTheDocument()
  })

  it("shows the FO's operational city below their name", () => {
    vi.mocked(useFoWeekCamps).mockReturnValue({})
    const geoByRole: Map<string, GeoProfileEntity> = new Map([['role-1', { city: 'Pune' } as GeoProfileEntity]])
    render(<FoAssignmentsWeekGrid roles={[roleFixture()]} geoByRole={geoByRole} onOpen={vi.fn()} />)

    expect(screen.getByText('Pune')).toBeInTheDocument()
  })

  it('shows a "—" placeholder when no geo profile exists for the FO', () => {
    vi.mocked(useFoWeekCamps).mockReturnValue({})
    render(<FoAssignmentsWeekGrid roles={[roleFixture()]} geoByRole={EMPTY_GEO} onOpen={vi.fn()} />)

    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('calls onOpen with the role id when the FO name button is clicked', async () => {
    vi.mocked(useFoWeekCamps).mockReturnValue({})
    const onOpen = vi.fn()
    render(<FoAssignmentsWeekGrid roles={[roleFixture()]} geoByRole={EMPTY_GEO} onOpen={onOpen} />)

    await userEvent.setup().click(screen.getByText('Jane FO'))
    expect(onOpen).toHaveBeenCalledWith('role-1')
  })

  it('calls onOpen with the role id when a camp button is activated', async () => {
    const todayCamp = campFixture({ date: new Date().toISOString() })
    vi.mocked(useFoWeekCamps).mockReturnValue({
      'role-1': { camps: [todayCamp], isLoading: false, error: null, refetch: vi.fn(), truncated: false },
    })
    const onOpen = vi.fn()
    render(<FoAssignmentsWeekGrid roles={[roleFixture()]} geoByRole={EMPTY_GEO} onOpen={onOpen} />)

    await userEvent.setup().click(screen.getByRole('button', { name: /open jane fo — camp cmp-000001/i }))
    expect(onOpen).toHaveBeenCalledWith('role-1')
  })

  it('queries the week using local calendar dates, not UTC-shifted ones (regression: toISOString() shifted IST midnight to the previous UTC day)', () => {
    vi.useFakeTimers()
    // A local time just after IST midnight (UTC+5:30) — toISOString() would report the PREVIOUS day.
    vi.setSystemTime(new Date('2026-03-10T00:30:00+05:30'))
    vi.mocked(useFoWeekCamps).mockReturnValue({})

    render(<FoAssignmentsWeekGrid roles={[roleFixture()]} geoByRole={EMPTY_GEO} onOpen={vi.fn()} />)

    const [, dateFrom, dateTo] = vi.mocked(useFoWeekCamps).mock.calls.at(-1)!
    // 10 Mar 2026 is a Tuesday — Monday of that week is 9 Mar 2026 local, never 8 Mar (the UTC-shifted bug).
    expect(dateFrom).toBe('2026-03-09')
    expect(dateTo).toBe('2026-03-15')
  })

  it('shows a retryable error across the whole row, not seven blank cells, when a FO camp fetch fails', async () => {
    const refetch = vi.fn()
    vi.mocked(useFoWeekCamps).mockReturnValue({
      'role-1': { camps: [], isLoading: false, error: new Error('fail'), refetch, truncated: false },
    })
    render(<FoAssignmentsWeekGrid roles={[roleFixture()]} geoByRole={EMPTY_GEO} onOpen={vi.fn()} />)

    const retry = screen.getByRole('button', { name: /couldn't load this week's camps/i })
    expect(retry).toBeInTheDocument()

    await userEvent.setup().click(retry)
    expect(refetch).toHaveBeenCalled()
  })

  it('shows a truncation warning next to the FO name when more camps exist than the cap returned', () => {
    vi.mocked(useFoWeekCamps).mockReturnValue({
      'role-1': { camps: [], isLoading: false, error: null, refetch: vi.fn(), truncated: true },
    })
    render(<FoAssignmentsWeekGrid roles={[roleFixture()]} geoByRole={EMPTY_GEO} onOpen={vi.fn()} />)

    expect(screen.getByTitle(/more camps exist this week than shown/i)).toBeInTheDocument()
  })
})
