import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ContactsTable from './ContactsTable'
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

describe('ContactsTable', () => {
  it('shows a Department column header', () => {
    render(<ContactsTable contacts={[]} onView={vi.fn()} />)
    expect(screen.getByText('Department')).toBeInTheDocument()
  })

  it('shows the human-readable designation and department labels, not the raw stored keys', () => {
    render(
      <ContactsTable
        contacts={[contactFixture({ department: 'marketing', designation: 'marketingmanager' })]}
        onView={vi.fn()}
      />,
    )

    expect(screen.getByText('Marketing Manager')).toBeInTheDocument()
    expect(screen.getByText('Marketing')).toBeInTheDocument()
    expect(screen.queryByText('marketingmanager')).not.toBeInTheDocument()
  })

  it('falls back to "—" when a contact has no department/designation', () => {
    render(<ContactsTable contacts={[contactFixture()]} onView={vi.fn()} />)
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2)
  })
})
