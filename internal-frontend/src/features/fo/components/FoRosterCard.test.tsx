import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FoRosterCard from './FoRosterCard'
import type { RoleEntity } from '@/types/accessManagement.types'
import type { FoRosterRatingSummary } from '@/features/fo/hooks/useFoRosterRatings'

const role = {
  id: 'fo-1', name: 'FO One', status: 'active',
  user: { firstName: 'Jane', lastName: 'FO', email: 'jane@example.com' },
  tenant: 'tenant-1', type: 'type-1', permissions: [], createdAt: '', updatedAt: '',
} as unknown as RoleEntity

function ratingSummary(overrides: Partial<FoRosterRatingSummary> = {}): FoRosterRatingSummary {
  return {
    average: 4.3,
    onTimeAverage: 4.5,
    attireAverage: 4.2,
    communicationAverage: 4.1,
    count: 7,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  }
}

describe('FoRosterCard rating metric', () => {
  it('renders the real average rating instead of the old Soon placeholder', () => {
    render(<FoRosterCard role={role} ratingSummary={ratingSummary()} onOpen={vi.fn()} />)

    const ratingTile = screen.getByText('★ Rating').parentElement
    expect(ratingTile).not.toBeNull()
    expect(within(ratingTile!).getByText('4.3')).toBeInTheDocument()
    expect(within(ratingTile!).queryByText('Soon')).not.toBeInTheDocument()
  })

  it('shows an honest empty value when the FO has no ratings', () => {
    render(<FoRosterCard role={role} ratingSummary={ratingSummary({ average: null, count: 0 })} onOpen={vi.fn()} />)

    const ratingTile = screen.getByText('★ Rating').parentElement
    expect(ratingTile).not.toBeNull()
    expect(within(ratingTile!).getByText('—')).toBeInTheDocument()
  })

  it('surfaces a failed rating request and lets the user retry it', async () => {
    const refetch = vi.fn()
    render(<FoRosterCard role={role} ratingSummary={ratingSummary({ error: new Error('failed'), refetch })} onOpen={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Retry rating for Jane FO' }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
