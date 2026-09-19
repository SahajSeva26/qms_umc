import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import CampsFilterBarReal from './CampsFilterBarReal'
import type { CampsRealFilterState } from '@/features/camps/hooks/useCampsRealFilters'

function filtersFixture(overrides: Partial<CampsRealFilterState> = {}): CampsRealFilterState {
  return {
    status: 'ALL',
    type: 'ALL',
    billingType: 'ALL',
    city: '',
    state: '',
    dateFrom: '',
    dateTo: '',
    ...overrides,
  }
}

describe('CampsFilterBarReal', () => {
  it('renders the Type select by default (hideType omitted)', () => {
    render(<CampsFilterBarReal filters={filtersFixture()} setFilter={vi.fn()} reset={vi.fn()} />)

    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Billing')).toBeInTheDocument()
  })

  it('renders the Type select when hideType is explicitly false', () => {
    render(<CampsFilterBarReal filters={filtersFixture()} setFilter={vi.fn()} reset={vi.fn()} hideType={false} />)

    expect(screen.getByText('Type')).toBeInTheDocument()
  })

  it('hides only the Type select when hideType is true — Status/Billing/City/State/dates still render', () => {
    const { container } = render(<CampsFilterBarReal filters={filtersFixture()} setFilter={vi.fn()} reset={vi.fn()} hideType />)

    expect(screen.queryByText('Type')).not.toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Billing')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('City...')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('State...')).toBeInTheDocument()
    expect(container.querySelectorAll('input[type="date"]')).toHaveLength(2)
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
  })
})
