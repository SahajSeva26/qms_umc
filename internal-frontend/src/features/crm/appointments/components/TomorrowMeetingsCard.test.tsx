import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import TomorrowMeetingsCard from './TomorrowMeetingsCard'
import { usePermission } from '@/hooks/usePermission'
import { appointmentsRealService } from '@/features/crm/appointments/appointmentsReal.service'
import { addDays, dayKey } from '@/utils/calendarDate'
import type { AppointmentEntity } from '@/types/appointment.types'

vi.mock('@/hooks/usePermission')
vi.mock('@/features/crm/appointments/appointmentsReal.service', () => ({
  appointmentsRealService: {
    searchAppointments: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function mockPermission(hasAnyPermission: (codes: string[]) => boolean) {
  vi.mocked(usePermission).mockReturnValue({ hasAnyPermission } as unknown as ReturnType<typeof usePermission>)
}

function meetingFixture(overrides: Partial<AppointmentEntity> = {}): AppointmentEntity {
  return {
    id: 'apt-1',
    code: 'apt-000001',
    tenant: { name: 'Cipla', code: 'clt-1' },
    division: { name: 'Cardiology', code: 'div-1', therapy: 'cardio' },
    type: 'new',
    salesPerson: { code: 'rep-1', name: 'Rep One', permissions: [], status: 'active', type: 'sales-rep', user: 'u-1', tenant: 't-1' },
    contactPerson: { tenant: 't-1', name: 'Dr. Mehta', designation: 'Chief Cardiologist', type: 'doctor', user: null, status: 'active' },
    internalMembers: [],
    mode: 'offline',
    location: 'HQ Andheri',
    duration: { startTime: '2026-11-04T04:30:00.000Z' },
    agenda: {},
    status: 'planned',
    mom: {},
    stageHistory: [],
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

function render_() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <TomorrowMeetingsCard />
    </QueryClientProvider>,
  )
}

// Regression: tomorrow's meetings, scoped by the backend's own-scope rule, non-cancelled, sorted by time.
describe('TomorrowMeetingsCard', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('queries exactly tomorrow\'s date window, not an open-ended range', async () => {
    mockPermission(() => false)
    render_()

    const tomorrow = addDays(new Date(), 1)
    await screen.findByText(/No meetings scheduled for tomorrow\./)

    expect(appointmentsRealService.searchAppointments).toHaveBeenCalledWith(
      expect.objectContaining({ dateFrom: dayKey(tomorrow), dateTo: dayKey(tomorrow) }),
    )
  })

  it('labels the scope "your" for a non-manager and "all" for an appointment:manage holder', async () => {
    mockPermission(() => false)
    const { unmount } = render_()
    expect(await screen.findByText(/meetings? in your calendar/)).toBeInTheDocument()
    unmount()

    mockPermission((codes) => codes.includes('appointment:manage'))
    render_()
    expect(await screen.findByText(/meetings? in all calendar/)).toBeInTheDocument()
  })

  // P1 regression: tenant:manage alone must also grant "all calendar" + owning salesperson —
  // the backend's own-scope rule grants full visibility to either permission, not just appointment:manage.
  it('labels the scope "all" and shows the owning salesperson for a tenant:manage-only holder', async () => {
    vi.mocked(appointmentsRealService.searchAppointments).mockResolvedValue({
      success: true,
      message: '',
      data: { items: [meetingFixture()], count: 1 },
    } as never)

    mockPermission((codes) => codes.includes('tenant:manage'))
    render_()

    expect(await screen.findByText(/meetings? in all calendar/)).toBeInTheDocument()
    expect(await screen.findByText(/Rep One/)).toBeInTheDocument()
  })

  it('shows the empty state when no meetings are scheduled for tomorrow', async () => {
    mockPermission(() => false)
    render_()
    expect(await screen.findByText('No meetings scheduled for tomorrow.')).toBeInTheDocument()
  })

  it('excludes cancelled meetings and sorts the rest by start time', async () => {
    mockPermission(() => false)
    vi.mocked(appointmentsRealService.searchAppointments).mockResolvedValueOnce({
      success: true,
      message: '',
      data: {
        items: [
          meetingFixture({ id: 'apt-late', duration: { startTime: '2026-11-04T10:00:00.000Z' } }),
          meetingFixture({ id: 'apt-cancelled', status: 'cancelled', duration: { startTime: '2026-11-04T03:00:00.000Z' } }),
          meetingFixture({ id: 'apt-early', duration: { startTime: '2026-11-04T04:00:00.000Z' } }),
        ],
        count: 3,
      },
    } as never)

    render_()

    const rows = await screen.findAllByText('Dr. Mehta · Cipla')
    expect(rows).toHaveLength(2) // the cancelled one is excluded
    // A short page (3 items, well under the 50 limit) is never truncation — just filtering.
    expect(await screen.findByText('2 meetings in your calendar')).toBeInTheDocument()
  })

  it('shows the owning sales person only when the viewer holds appointment:manage', async () => {
    vi.mocked(appointmentsRealService.searchAppointments).mockResolvedValue({
      success: true,
      message: '',
      data: { items: [meetingFixture()], count: 1 },
    } as never)

    mockPermission(() => false)
    const { unmount } = render_()
    await screen.findByText('Dr. Mehta · Cipla')
    expect(screen.queryByText(/Rep One/)).not.toBeInTheDocument()
    unmount()

    mockPermission((codes) => codes.includes('appointment:manage'))
    render_()
    await screen.findByText('Dr. Mehta · Cipla')
    expect(await screen.findByText(/Rep One/)).toBeInTheDocument()
  })

  // P2 regression: a full page must show a visible "showing first N of M" truncation message.
  it('shows a "showing first N of M" message when the backend count exceeds the fetched page', async () => {
    const items = Array.from({ length: 50 }, (_, i) => meetingFixture({
      id: `apt-${i}`,
      duration: { startTime: `2026-11-04T0${(i % 9) + 1}:00:00.000Z` },
    }))
    vi.mocked(appointmentsRealService.searchAppointments).mockResolvedValueOnce({
      success: true,
      message: '',
      data: { items, count: 63 },
    } as never)

    mockPermission(() => false)
    render_()

    expect(await screen.findByText('Showing first 50 of 63 meetings in your calendar')).toBeInTheDocument()
  })

  it('shows the plain count, not a truncation message, when every meeting fits in one page', async () => {
    vi.mocked(appointmentsRealService.searchAppointments).mockResolvedValueOnce({
      success: true,
      message: '',
      data: { items: [meetingFixture()], count: 1 },
    } as never)

    mockPermission(() => false)
    render_()

    expect(await screen.findByText('1 meeting in your calendar')).toBeInTheDocument()
    expect(screen.queryByText(/Showing first/)).not.toBeInTheDocument()
  })
})
