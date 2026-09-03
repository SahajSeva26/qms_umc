import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'

// NewAppointmentDialog pulls in Tenant/Division/Contact/Role pickers even
// when their sections aren't the focus of this test — mock the underlying
// services so those queries resolve to empty lists instead of hitting the
// real API layer.
vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    searchTenants: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
    searchRoles: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))
vi.mock('@/features/crm/divisions/division.service', () => ({
  divisionService: {
    searchDivisions: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))
vi.mock('@/features/contacts/contacts.service', () => ({
  contactsService: {
    searchContacts: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))
vi.mock('@/features/crm/appointments/hooks/useCreateAppointment', () => ({
  useCreateAppointment: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderDialog(prefill: { date: string; hour: number } | undefined, key?: string | number) {
  const NewAppointmentDialog = (await import('./NewAppointmentDialog')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <NewAppointmentDialog key={key} open onClose={vi.fn()} onCreated={vi.fn()} prefill={prefill} />
    </QueryClientProvider>,
  )
}

describe('NewAppointmentDialog — prefill from the clicked calendar slot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the clicked slot\'s date and start/end hour, not today\'s date and 10:00-11:00', async () => {
    await renderDialog({ date: '2026-09-02', hour: 14 }, 'slot-1')

    expect(await screen.findByText('02 Sep 2026', {}, { timeout: 10000 })).toBeInTheDocument()
    expect(screen.getAllByText('14').length).toBeGreaterThan(0)
    expect(screen.getAllByText('15').length).toBeGreaterThan(0)
  }, 15000)

  it('falls back to today\'s date and 10:00-11:00 when opened with no prefill (the header "New appointment" button)', async () => {
    await renderDialog(undefined, 'blank')

    expect(screen.getAllByText('10').length).toBeGreaterThan(0)
    expect(screen.getAllByText('11').length).toBeGreaterThan(0)
  })

  it('regression: remounting with a NEW key picks up a different prefill even when reopened after a previous session', async () => {
    const NewAppointmentDialog = (await import('./NewAppointmentDialog')).default
    const client = makeQueryClient()

    const { rerender } = render(
      <QueryClientProvider client={client}>
        <NewAppointmentDialog key="session-1" open onClose={vi.fn()} onCreated={vi.fn()} prefill={{ date: '2026-09-02', hour: 14 }} />
      </QueryClientProvider>,
    )
    expect(await screen.findByText('02 Sep 2026', {}, { timeout: 10000 })).toBeInTheDocument()

    // Simulates: dialog closed, then the SAME slot clicked again. A parent
    // that only keys off the prefill value (unchanged here) would fail to
    // remount and this dialog would keep showing whatever it last reset to.
    // A parent using a monotonically increasing session id (the real fix)
    // always remounts — modeled here by giving it a new key regardless of
    // whether the prefill value itself changed.
    rerender(
      <QueryClientProvider client={client}>
        <NewAppointmentDialog key="session-2" open onClose={vi.fn()} onCreated={vi.fn()} prefill={{ date: '2026-09-02', hour: 14 }} />
      </QueryClientProvider>,
    )

    expect(await screen.findByText('02 Sep 2026', {}, { timeout: 10000 })).toBeInTheDocument()
    expect(screen.getAllByText('14').length).toBeGreaterThan(0)
    expect(screen.getAllByText('15').length).toBeGreaterThan(0)
  }, 20000)
})
