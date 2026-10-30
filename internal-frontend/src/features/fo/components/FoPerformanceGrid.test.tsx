import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FoPerformanceGrid from './FoPerformanceGrid'
import type { RoleEntity } from '@/types/accessManagement.types'
import type { FoRosterCampSummary } from '@/features/fo/hooks/useFoRosterCamps'
import type { FoRosterRatingSummary } from '@/features/fo/hooks/useFoRosterRatings'

const role = {
  id: 'fo-1', name: 'FO One', status: 'active',
  user: { firstName: 'Jane', lastName: 'FO', email: 'jane@example.com' },
  tenant: 'tenant-1', type: 'type-1', permissions: [], createdAt: '', updatedAt: '',
} as unknown as RoleEntity

const rating: FoRosterRatingSummary = {
  average: 4.4,
  onTimeAverage: 4.6,
  attireAverage: 4.2,
  communicationAverage: 4.3,
  count: 8,
  isLoading: false,
  error: null,
  refetch: vi.fn(),
}

const camps: FoRosterCampSummary = {
  todayCamp: null,
  closedCount: 6,
  upcomingCount: 1,
  isLoading: false,
  error: null,
  refetch: vi.fn(),
  truncated: false,
}

describe('FoPerformanceGrid', () => {
  it('renders only real rating and camp metrics, not the prototype mock score fields', () => {
    render(<FoPerformanceGrid roles={[role]} geoByRole={new Map()} campSummaries={{ 'fo-1': camps }} ratingsByRole={{ 'fo-1': rating }} onOpen={vi.fn()} />)

    expect(screen.getByText('Jane FO')).toBeInTheDocument()
    expect(screen.getByText('4.4')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('4.6')).toBeInTheDocument()
    expect(screen.getByText('4.3')).toBeInTheDocument()
    expect(screen.queryByText(/occupancy/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^score$/i)).not.toBeInTheDocument()
  })

  it('opens the existing FO drawer from the officer name', async () => {
    const onOpen = vi.fn()
    render(<FoPerformanceGrid roles={[role]} geoByRole={new Map()} campSummaries={{ 'fo-1': camps }} ratingsByRole={{ 'fo-1': rating }} onOpen={onOpen} />)

    await userEvent.click(screen.getByRole('button', { name: /jane fo/i }))
    expect(onOpen).toHaveBeenCalledWith('fo-1')
  })

  it('keeps a ratings failure distinct and exposes retry', async () => {
    const refetch = vi.fn()
    render(
      <FoPerformanceGrid
        roles={[role]}
        geoByRole={new Map()}
        campSummaries={{ 'fo-1': camps }}
        ratingsByRole={{ 'fo-1': { ...rating, error: new Error('down'), refetch } }}
        onOpen={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /ratings unavailable/i }))
    expect(refetch).toHaveBeenCalledOnce()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})
