import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import WeeklyPlanRowFields, { type WeeklyPlanRowDraft } from './WeeklyPlanRowFields'

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    searchTenants: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
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
vi.mock('@/features/billing/invoice.service', () => ({
  invoiceService: {
    searchInvoices: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))
vi.mock('@/features/crm/crm.service', () => ({
  crmService: { searchLeads: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })) },
}))
vi.mock('@/hooks/useSession', () => ({
  useSession: () => ({ session: { role: { id: 'role-rep-1' } }, hasPermission: () => false }),
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

const baseRow = (date: string): WeeklyPlanRowDraft => ({
  tenant: 'tenant-1',
  division: 'division-1',
  contactPerson: 'contact-1',
  date,
})

function renderRow(date: string, weekStart: string, weekEnd: string) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <WeeklyPlanRowFields
        row={baseRow(date)}
        index={0}
        onChange={vi.fn()}
        onRemove={vi.fn()}
        canRemove={false}
        weekStart={weekStart}
        weekEnd={weekEnd}
      />
    </QueryClientProvider>,
  )
}

// Regression for a P1 finding: a visit date was silently accepted outside the plan's own week.
describe('WeeklyPlanRowFields — visit date must fall within the plan\'s week', () => {
  it('shows the out-of-week warning when the visit date is before the week start', () => {
    renderRow('2026-08-02T09:00:00.000Z', '2026-08-03', '2026-08-09')
    expect(screen.getByText(/visit date must fall within the plan's week/i)).toBeInTheDocument()
  })

  it('shows the out-of-week warning when the visit date is after the week end', () => {
    renderRow('2026-08-10T09:00:00.000Z', '2026-08-03', '2026-08-09')
    expect(screen.getByText(/visit date must fall within the plan's week/i)).toBeInTheDocument()
  })

  it('shows no warning when the visit date falls inside the week', () => {
    renderRow('2026-08-06T09:00:00.000Z', '2026-08-03', '2026-08-09')
    expect(screen.queryByText(/visit date must fall within the plan's week/i)).not.toBeInTheDocument()
  })

  it('shows no warning when the visit date sits exactly on a week boundary', () => {
    renderRow('2026-08-03T09:00:00.000Z', '2026-08-03', '2026-08-09')
    expect(screen.queryByText(/visit date must fall within the plan's week/i)).not.toBeInTheDocument()
  })
})
