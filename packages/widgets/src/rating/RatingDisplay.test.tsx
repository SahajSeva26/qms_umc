import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { RatingEntity } from '@qms/core'
import RatingDisplay from './RatingDisplay'

function ratingFixture(overrides: Partial<RatingEntity> = {}): RatingEntity {
  return {
    id: 'rating-1', camp: null, worker: null,
    ratedBy: { id: 'mr-1', name: 'Amit Desai', code: 'mr-001' },
    tenant: null, onTime: 5, attire: 4, communication: 3, overall: 4,
    ratedAt: '2026-09-21T00:00:00.000Z', createdAt: '2026-09-21T00:00:00.000Z', updatedAt: '2026-09-21T00:00:00.000Z',
    ...overrides,
  }
}

describe('RatingDisplay', () => {
  it('shows Overall plus each of the three real backend grounds (onTime/attire/communication)', () => {
    render(<RatingDisplay rating={ratingFixture()} />)

    expect(screen.getByText('Overall')).toBeInTheDocument()
    expect(screen.getByText('On time')).toBeInTheDocument()
    expect(screen.getByText('Attire')).toBeInTheDocument()
    expect(screen.getByText('Communication')).toBeInTheDocument()
    expect(screen.getByText('5/5')).toBeInTheDocument()
    expect(screen.getAllByText('4/5')).toHaveLength(2)
    expect(screen.getByText('3/5')).toBeInTheDocument()
  })

  it('shows the audit line with the rater name and date when ratedBy is present', () => {
    render(<RatingDisplay rating={ratingFixture({ ratedBy: { id: 'mr-1', name: 'Amit Desai', code: 'mr-001' } })} />)

    expect(screen.getByText(/Rated by Amit Desai on/)).toBeInTheDocument()
  })

  it('omits the audit line when ratedBy is absent', () => {
    render(<RatingDisplay rating={ratingFixture({ ratedBy: null })} />)

    expect(screen.queryByText(/Rated by/)).not.toBeInTheDocument()
  })
})
