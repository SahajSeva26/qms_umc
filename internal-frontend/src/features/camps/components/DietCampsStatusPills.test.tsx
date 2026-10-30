import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import DietCampsStatusPills from './DietCampsStatusPills'

const counts = {
  requested: 3,
  confirmed: 2,
  live: 1,
  closed: 5,
  cancelled: 4,
  cancelled_charged: 1,
}

describe('DietCampsStatusPills', () => {
  it('maps backend statuses to the diet-management labels and counts', () => {
    render(<DietCampsStatusPills counts={counts} total={16} activeStatus="confirmed" onSelect={vi.fn()} />)

    expect(screen.getByRole('button', { name: /all 16/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /upcoming 2/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /cancelled · charged 1/i })).toBeInTheDocument()
  })

  it('returns the real backend status when a display pill is selected', async () => {
    const onSelect = vi.fn()
    render(<DietCampsStatusPills counts={counts} total={16} activeStatus="ALL" onSelect={onSelect} />)

    await userEvent.setup().click(screen.getByRole('button', { name: /completed 5/i }))

    expect(onSelect).toHaveBeenCalledWith('closed')
  })
})
