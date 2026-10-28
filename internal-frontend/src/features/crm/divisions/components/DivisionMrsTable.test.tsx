import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import DivisionMrsTable from './DivisionMrsTable'
import type { RoleEntity } from '@/types/accessManagement.types'

function mrFixture(): RoleEntity {
  return {
    id: 'role-1',
    code: 'phr-mr-001',
    name: 'pharma-mr role for Ravi',
    permissions: [],
    status: 'active',
    type: { id: 'rt-mr', code: 'pharma-mr', name: 'pharma-mr' },
    user: { firstName: 'Ravi', lastName: 'Kumar', email: 'ravi@example.com', phone: '9999999999' },
    tenant: { name: 'Test Pharma', code: 'test-pharma' },
    createdAt: '', updatedAt: '',
  } as RoleEntity
}

describe('DivisionMrsTable', () => {
  it('renders name, email, phone, and a status pill', () => {
    render(<DivisionMrsTable mrs={[mrFixture()]} />)

    expect(screen.getByText('Ravi Kumar')).toBeInTheDocument()
    expect(screen.getByText('ravi@example.com')).toBeInTheDocument()
    expect(screen.getByText('9999999999')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  // Deliberately no navigation — the only detail page today (the global Role
  // editor) is the wrong destination from a Division context.
  it('renders the MR name as plain, non-interactive text — no link, nothing focusable', () => {
    render(<DivisionMrsTable mrs={[mrFixture()]} />)

    expect(screen.getByText('Ravi Kumar')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows an empty state when there are no MRs', () => {
    render(<DivisionMrsTable mrs={[]} />)

    expect(screen.getByText(/no mrs found/i)).toBeInTheDocument()
  })
})
