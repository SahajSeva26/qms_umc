import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import CampsFilterBarReal from './CampsFilterBarReal'
import type { CampsRealFilterState } from '@/features/camps/hooks/useCampsRealFilters'

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

// DoctorAsyncPicker/TenantAsyncPicker call useQuery, so a QueryClientProvider is required here.
function renderWithQueryClient(ui: React.ReactElement) {
  return render(<QueryClientProvider client={makeQueryClient()}>{ui}</QueryClientProvider>)
}

function filtersFixture(overrides: Partial<CampsRealFilterState> = {}): CampsRealFilterState {
  return {
    status: 'ALL',
    type: 'ALL',
    billingType: 'ALL',
    code: '',
    city: '',
    state: '',
    dateFrom: '',
    dateTo: '',
    doctorId: '',
    doctorLabel: '',
    clientId: '',
    clientLabel: '',
    ...overrides,
  }
}

describe('CampsFilterBarReal', () => {
  it('renders the Type select by default (hideType omitted)', () => {
    renderWithQueryClient(<CampsFilterBarReal filters={filtersFixture()} setFilter={vi.fn()} reset={vi.fn()} />)

    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Billing')).toBeInTheDocument()
  })

  it('renders the Type select when hideType is explicitly false', () => {
    renderWithQueryClient(<CampsFilterBarReal filters={filtersFixture()} setFilter={vi.fn()} reset={vi.fn()} hideType={false} />)

    expect(screen.getByText('Type')).toBeInTheDocument()
  })

  it('hides only the Type select when hideType is true — Status/Billing/City/State/dates still render', () => {
    renderWithQueryClient(<CampsFilterBarReal filters={filtersFixture()} setFilter={vi.fn()} reset={vi.fn()} hideType />)

    expect(screen.queryByText('Type')).not.toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Billing')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search by city...')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('State...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /date from/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /date to/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
  })
})
