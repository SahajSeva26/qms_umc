import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'

vi.mock('@/hooks/usePermission')
vi.mock('@/features/crm/appointments/appointmentsReal.service', () => ({
  appointmentsRealService: {
    searchAppointments: vi.fn(),
    getAppointment: vi.fn(),
    getAppointmentReport: vi.fn(),
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function mockPermission(canViewReport: boolean) {
  const { usePermission } = await import('@/hooks/usePermission')
  vi.mocked(usePermission).mockReturnValue({
    hasPermission: (code: string) => (code === 'appointment:manage' ? canViewReport : false),
  } as unknown as ReturnType<typeof usePermission>)
}

async function renderPage() {
  const AppointmentsPage = (await import('./AppointmentsPage')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <AppointmentsPage />
    </QueryClientProvider>,
  )
}

describe('AppointmentsPage — appointment report KPI strip', () => {
  beforeEach(async () => {
    // resetAllMocks clears the vi.mock factory's default implementations too
    // (not just per-test overrides) — re-establish them so the calendar's own
    // fetch (searchAppointments/getAppointment) never silently resolves to
    // undefined in a later test that doesn't itself set up those two mocks.
    vi.resetAllMocks()
    const { appointmentsRealService } = await import('@/features/crm/appointments/appointmentsReal.service')
    vi.mocked(appointmentsRealService.searchAppointments).mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })
    vi.mocked(appointmentsRealService.getAppointment).mockResolvedValue({ success: true, message: '', data: null as never })
    vi.mocked(appointmentsRealService.getAppointmentReport).mockResolvedValue({
      success: true,
      message: '',
      data: { summary: { total: 0, planned: 0, done: 0, cancelled: 0 }, byStatus: [], byType: [] },
    })
  })

  it('hides the strip and never calls getAppointmentReport without appointment:manage', async () => {
    await mockPermission(false)
    await renderPage()

    expect(await screen.findByText(/statistics are available to appointment managers/i)).toBeInTheDocument()
    expect(screen.queryByTestId('appointment-kpi-strip')).not.toBeInTheDocument()

    const { appointmentsRealService } = await import('@/features/crm/appointments/appointmentsReal.service')
    expect(appointmentsRealService.getAppointmentReport).not.toHaveBeenCalled()
  })

  it('renders real counts from GET /appointments/report, not derived from the fetched appointment list', async () => {
    const { appointmentsRealService } = await import('@/features/crm/appointments/appointmentsReal.service')
    vi.mocked(appointmentsRealService.getAppointmentReport).mockResolvedValue({
      success: true,
      message: '',
      data: {
        summary: { total: 12, planned: 8, done: 3, cancelled: 1 },
        byStatus: [],
        byType: [],
      },
    })
    await mockPermission(true)
    await renderPage()

    const strip = within(await screen.findByTestId('appointment-kpi-strip'))
    expect(strip.getByText('12')).toBeInTheDocument()
    expect(strip.getByText('8')).toBeInTheDocument()
    expect(strip.getByText('3')).toBeInTheDocument()
    expect(strip.getByText('1')).toBeInTheDocument()
  })

  it('re-queries the report with a new date range when the calendar navigates', async () => {
    const { appointmentsRealService } = await import('@/features/crm/appointments/appointmentsReal.service')
    await mockPermission(true)
    await renderPage()

    // Week view makes every "next" click shift the visible range by exactly
    // 7 days, guaranteeing a changed dateFrom/dateTo — month view's range
    // only changes once the cursor crosses into a new month. Switching to
    // week view is itself a range change (a 7-day window vs month view's
    // 42-cell grid), so let that settle before capturing the "before" query.
    fireEvent.click(await screen.findByRole('button', { name: 'Week' }))
    await waitFor(() => expect(appointmentsRealService.getAppointmentReport).toHaveBeenCalled())

    const callsBeforeNav = vi.mocked(appointmentsRealService.getAppointmentReport).mock.calls.length
    const firstCallQuery = vi.mocked(appointmentsRealService.getAppointmentReport).mock.calls[callsBeforeNav - 1][0]

    fireEvent.click(await screen.findByRole('button', { name: /next week/i }))

    await waitFor(() => expect(appointmentsRealService.getAppointmentReport).toHaveBeenCalledTimes(callsBeforeNav + 1))
    const secondCallQuery = vi.mocked(appointmentsRealService.getAppointmentReport).mock.calls[callsBeforeNav][0]

    expect(secondCallQuery).not.toEqual(firstCallQuery)
  })
})

describe('AppointmentsPage — month view day click opens New Appointment directly', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    const { appointmentsRealService } = await import('@/features/crm/appointments/appointmentsReal.service')
    vi.mocked(appointmentsRealService.searchAppointments).mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })
    vi.mocked(appointmentsRealService.getAppointment).mockResolvedValue({ success: true, message: '', data: null as never })
    vi.mocked(appointmentsRealService.getAppointmentReport).mockResolvedValue({
      success: true,
      message: '',
      data: { summary: { total: 0, planned: 0, done: 0, cancelled: 0 }, byStatus: [], byType: [] },
    })
    await mockPermission(false)
  })

  it('opens New Appointment on a single click, not a switch to week view', async () => {
    await renderPage()

    // Month is the page's default view — a mid-month day (15) is unambiguous
    // and always renders as an in-month cell regardless of which month is current.
    fireEvent.click(await screen.findByRole('button', { name: '15' }))

    // The dialog only ever opens via handleSlotClick/handleNewAppointment —
    // the old behavior (setCursor + setView('week')) never opens it at all,
    // so this alone proves the fix, without needing a second, weaker signal.
    // Scoped to the heading role since the toolbar's own "+ New appointment"
    // button shares the same text.
    expect(await screen.findByRole('heading', { name: 'New appointment' })).toBeInTheDocument()
  })

  it('shows the current month, not a 7-day week range, while month view is active', async () => {
    const { formatMonthLabel } = await import('@/features/crm/appointments/appointments.utils')
    await renderPage()

    // Month is the default view — the toolbar's date label must read the
    // actual visible month (e.g. "September 2026"), not fall through to the
    // week-range formatter it used before this fix.
    expect(await screen.findByText(formatMonthLabel(new Date()))).toBeInTheDocument()
  })

  it('Next in month view advances by a whole month, updates the title, and immediately re-queries the report with a new range', async () => {
    const { formatMonthLabel } = await import('@/features/crm/appointments/appointments.utils')
    const { appointmentsRealService } = await import('@/features/crm/appointments/appointmentsReal.service')
    // Re-enable the report for this one test (the outer beforeEach forces it off).
    await mockPermission(true)
    await renderPage()

    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    expect(await screen.findByText(formatMonthLabel(now))).toBeInTheDocument()
    await waitFor(() => expect(appointmentsRealService.getAppointmentReport).toHaveBeenCalledTimes(1))
    const beforeQuery = vi.mocked(appointmentsRealService.getAppointmentReport).mock.calls[0][0]

    // A single click must be enough — not several ±7-day steps through the
    // rest of the current month before reaching the next one.
    fireEvent.click(await screen.findByRole('button', { name: /next month/i }))

    expect(await screen.findByText(formatMonthLabel(nextMonth))).toBeInTheDocument()
    expect(screen.queryByText(formatMonthLabel(now))).not.toBeInTheDocument()

    await waitFor(() => expect(appointmentsRealService.getAppointmentReport).toHaveBeenCalledTimes(2))
    const afterQuery = vi.mocked(appointmentsRealService.getAppointmentReport).mock.calls[1][0]
    expect(afterQuery).not.toEqual(beforeQuery)
  })
})
