import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ContactDrawer from './ContactDrawer'
import type { ContactEntity } from '@/types/contact.types'

function contactFixture(overrides: Partial<ContactEntity> = {}): ContactEntity {
  return {
    id: 'c-1',
    tenant: 't-1',
    name: 'Shalini Gupta',
    type: 'customer',
    user: null,
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as ContactEntity
}

describe('ContactDrawer', () => {
  it('shows the human-readable designation and department in the header subtitle, not the raw stored keys', () => {
    render(
      <ContactDrawer
        contact={contactFixture({ department: 'marketing', designation: 'marketingmanager' })}
        canEdit={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
      />,
    )

    expect(screen.getByText(/Marketing Manager/)).toBeInTheDocument()
    expect(screen.queryByText('marketingmanager')).not.toBeInTheDocument()
  })

  it('shows a Department row with the human-readable label in the details grid', () => {
    render(
      <ContactDrawer
        contact={contactFixture({ department: 'purchase' })}
        canEdit={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
      />,
    )

    expect(screen.getByText('Department')).toBeInTheDocument()
    expect(screen.getByText('Purchase')).toBeInTheDocument()
  })
})
