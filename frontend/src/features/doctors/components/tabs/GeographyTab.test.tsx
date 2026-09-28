import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GeographyTab from './GeographyTab'
import type { DoctorEntity } from '@/types/doctor.types'

function makeDoctor(id: string, city: string, state: string): DoctorEntity {
  return {
    id,
    pharmaCode: `PC-${id}`,
    name: `Dr ${id}`,
    specialization: 'cp',
    mobile: '9999999999',
    email: `${id}@example.com`,
    location: { addressLine1: '', city, state, pincode: '', coordinates: [0, 0] },
    createdAt: '',
    updatedAt: '',
    tenant: 't-1',
  }
}

describe('GeographyTab', () => {
  it('two doctors with the same city name in different states appear as two distinct rows in "By city"', () => {
    const doctors = [
      makeDoctor('1', 'Springfield', 'Illinois'),
      makeDoctor('2', 'Springfield', 'Missouri'),
    ]
    render(<GeographyTab doctors={doctors} onSelectCityState={vi.fn()} />)

    const rows = screen.getAllByRole('cell', { name: 'Springfield' })
    expect(rows).toHaveLength(2)
    expect(screen.getByRole('cell', { name: 'Illinois' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Missouri' })).toBeInTheDocument()
  })

  it('two doctors with the same city AND state merge into one row with count 2', () => {
    const doctors = [
      makeDoctor('1', 'Pune', 'Maharashtra'),
      makeDoctor('2', 'Pune', 'Maharashtra'),
    ]
    render(<GeographyTab doctors={doctors} onSelectCityState={vi.fn()} />)

    expect(screen.getAllByText('Pune')).toHaveLength(1)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('clicking a city row calls onSelectCityState with BOTH city and state', async () => {
    const onSelectCityState = vi.fn()
    const doctors = [makeDoctor('1', 'Pune', 'Maharashtra')]
    render(<GeographyTab doctors={doctors} onSelectCityState={onSelectCityState} />)

    const user = userEvent.setup()
    const cityCell = screen.getByRole('cell', { name: 'Pune' })
    await user.click(cityCell.closest('tr')!)

    expect(onSelectCityState).toHaveBeenCalledWith('Pune', 'Maharashtra')
  })

  it('clicking one of two same-named-city rows selects the correct state, not the other one', async () => {
    const onSelectCityState = vi.fn()
    const doctors = [
      makeDoctor('1', 'Springfield', 'Illinois'),
      makeDoctor('2', 'Springfield', 'Missouri'),
    ]
    render(<GeographyTab doctors={doctors} onSelectCityState={onSelectCityState} />)

    const user = userEvent.setup()
    const missouriCell = screen.getByRole('cell', { name: 'Missouri' })
    await user.click(missouriCell.closest('tr')!)

    expect(onSelectCityState).toHaveBeenCalledWith('Springfield', 'Missouri')
    expect(onSelectCityState).not.toHaveBeenCalledWith('Springfield', 'Illinois')
  })

  it('doctors with no location are excluded from both aggregates', () => {
    const doctors: DoctorEntity[] = [
      makeDoctor('1', 'Pune', 'Maharashtra'),
      { ...makeDoctor('2', '', ''), location: null },
    ]
    render(<GeographyTab doctors={doctors} onSelectCityState={vi.fn()} />)

    expect(screen.getAllByText('Pune')).toHaveLength(1)
  })

  it('renders empty-state copy when there are no doctors', () => {
    render(<GeographyTab doctors={[]} onSelectCityState={vi.fn()} />)
    expect(screen.getAllByText(/no doctors on record/i).length).toBeGreaterThan(0)
  })
})
