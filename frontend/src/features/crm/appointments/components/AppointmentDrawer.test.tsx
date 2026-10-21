import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AppointmentDrawer from './AppointmentDrawer'
import { usePermission } from '@/hooks/usePermission'
import type { AppointmentEntity } from '@/types/appointment.types'

vi.mock('@/hooks/usePermission')
vi.mock('@/features/crm/appointments/appointmentsReal.service', () => ({
  appointmentsRealService: {
    moveAppointmentStage: vi.fn(),
    respondToAppointment: vi.fn(),
    updateAppointment: vi.fn(),
  },
}))

let lastNewLeadWizardProps: { prefill?: Record<string, unknown> } | null = null
vi.mock('@/features/crm/components/NewLeadWizard', () => ({
  default: (props: { prefill?: Record<string, unknown> }) => {
    lastNewLeadWizardProps = props
    return <div>New lead wizard</div>
  },
}))

function appointmentFixture(overrides: Partial<AppointmentEntity> = {}): AppointmentEntity {
  return {
    id: 'appt-1',
    code: 'apt-000001',
    tenant: { _id: 't-1', name: 'Sunrise Pharma' },
    division: { _id: 'div-1', name: 'Cardio' },
    type: 'meeting',
    salesPerson: { _id: 'r-1', name: 'Amit' },
    contactPerson: { _id: 'c-1', name: 'Dr. Mehta' },
    internalMembers: [],
    mode: 'in-person',
    duration: { startTime: '2026-09-10T10:00:00.000Z', endTime: '2026-09-10T11:00:00.000Z' },
    agenda: { public: 'Discuss renewal' },
    status: 'done',
    mom: { details: 'Went well' },
    stageHistory: [],
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-10T11:00:00.000Z',
    ...overrides,
  } as AppointmentEntity
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderDrawer(appointment: AppointmentEntity | null) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <AppointmentDrawer appointment={appointment} onClose={vi.fn()} />
    </QueryClientProvider>,
  )
}

function mockPermission(hasAnyPermission: (codes: string[]) => boolean) {
  vi.mocked(usePermission).mockReturnValue({
    session: { role: { id: 'r-1' } },
    hasAnyPermission,
  } as unknown as ReturnType<typeof usePermission>)
}

describe('AppointmentDrawer — "+ New lead" availability after the appointment is already terminal', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    lastNewLeadWizardProps = null
    // Default: permitted, so these tests exercise the happy path — the gating itself has its own describe block below.
    mockPermission(() => true)
  })

  it('shows "+ New lead" in the read-only footer for a done appointment, even though the Mark-done dialog was never used', () => {
    renderDrawer(appointmentFixture({ status: 'done' }))

    expect(screen.getByText(/this appointment is done/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /\+ new lead/i })).toBeInTheDocument()
  })

  it('does not show "+ New lead" for a cancelled appointment', () => {
    renderDrawer(appointmentFixture({ status: 'cancelled' }))

    expect(screen.getByText(/this appointment is cancelled/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /\+ new lead/i })).not.toBeInTheDocument()
  })

  it('clicking the read-only "+ New lead" opens the wizard, prefilled from the appointment', async () => {
    const user = userEvent.setup()
    renderDrawer(appointmentFixture({ status: 'done' }))

    await user.click(screen.getByRole('button', { name: /\+ new lead/i }))

    expect(await screen.findByText('New lead wizard')).toBeInTheDocument()
    expect(lastNewLeadWizardProps?.prefill).toEqual(
      expect.objectContaining({
        tenantId: 't-1',
        tenantLabel: 'Sunrise Pharma',
        divisionId: 'div-1',
        divisionLabel: 'Cardio',
        contactPersonId: 'c-1',
        contactPersonLabel: 'Dr. Mehta',
        salesPersonId: 'r-1',
        salesPersonLabel: 'Amit',
      }),
    )
  })

  it('does not show the Mark-done/Reschedule/Cancel action row for a terminal (done) appointment', () => {
    renderDrawer(appointmentFixture({ status: 'done' }))

    expect(screen.queryByRole('button', { name: /mark done/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reschedule/i })).not.toBeInTheDocument()
  })
})

// POST /leads requires lead:manage or tenant:manage (lead.routes.ts) — a viewer who can read a done appointment may hold neither.
describe('AppointmentDrawer — "+ New lead" is gated on lead:manage/tenant:manage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    lastNewLeadWizardProps = null
  })

  it('hides the read-only-footer "+ New lead" for a done appointment when the viewer lacks lead:manage/tenant:manage', () => {
    mockPermission(() => false)
    renderDrawer(appointmentFixture({ status: 'done' }))

    expect(screen.getByText(/this appointment is done/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /\+ new lead/i })).not.toBeInTheDocument()
  })

  it('shows the read-only-footer "+ New lead" for a done appointment when the viewer holds lead:manage', () => {
    mockPermission((codes) => codes.includes('lead:manage'))
    renderDrawer(appointmentFixture({ status: 'done' }))

    expect(screen.getByRole('button', { name: /\+ new lead/i })).toBeInTheDocument()
  })

  it('shows the read-only-footer "+ New lead" for a done appointment when the viewer holds tenant:manage', () => {
    mockPermission((codes) => codes.includes('tenant:manage'))
    renderDrawer(appointmentFixture({ status: 'done' }))

    expect(screen.getByRole('button', { name: /\+ new lead/i })).toBeInTheDocument()
  })

  it('hides the Mark-done dialog\'s "+ New lead" when the viewer lacks lead:manage/tenant:manage', async () => {
    mockPermission(() => false)
    const user = userEvent.setup()
    renderDrawer(appointmentFixture({ status: 'planned' }))

    await user.click(screen.getByRole('button', { name: /mark done/i }))

    expect(await screen.findByText('Move to Done')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /\+ new lead/i })).not.toBeInTheDocument()
  })

  it('shows the Mark-done dialog\'s "+ New lead" when the viewer holds lead:manage', async () => {
    mockPermission((codes) => codes.includes('lead:manage'))
    const user = userEvent.setup()
    renderDrawer(appointmentFixture({ status: 'planned' }))

    await user.click(screen.getByRole('button', { name: /mark done/i }))

    expect(await screen.findByText('Move to Done')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /\+ new lead/i })).toBeInTheDocument()
  })
})
