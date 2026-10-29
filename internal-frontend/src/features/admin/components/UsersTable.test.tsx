import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import UsersTable from './UsersTable'
import type { User } from '@/types/user.types'
import type { UserRoleLabelsEntry } from '@/features/admin/hooks/useUserRoleLabels'

const users: User[] = [{
  _id: 'user-1', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com',
  status: 'active', avatarTone: 'blue', createdAt: '2026-10-01T00:00:00.000Z',
}]

const rolesByEmail: Record<string, UserRoleLabelsEntry> = {
  'jane@example.com': {
    roles: [{ code: 'sales-head', name: 'Sales Head' }],
    isLoading: false, error: null, refetch: () => undefined,
  },
}

function LocationProbe() {
  return <div data-testid="location">{useLocation().pathname}</div>
}

describe('UsersTable', () => {
  it('renders a real table using only backed user fields and no Reassign column', () => {
    render(<MemoryRouter><UsersTable users={users} canOpenDetail={false} rolesByEmail={rolesByEmail} /></MemoryRouter>)

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'User' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Role' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Joined' })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /reassign/i })).not.toBeInTheDocument()
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    expect(screen.getByText('Sales Head')).toBeInTheDocument()
  })

  it('opens the real user detail route only when user:get allows it', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <UsersTable users={users} canOpenDetail rolesByEmail={rolesByEmail} />
        <LocationProbe />
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Open Jane Doe' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/admin/users/user-1')
  })

  it('does not expose a fake action when detail access is unavailable', () => {
    render(<MemoryRouter><UsersTable users={users} canOpenDetail={false} rolesByEmail={rolesByEmail} /></MemoryRouter>)
    expect(screen.queryByRole('button', { name: 'Open Jane Doe' })).not.toBeInTheDocument()
  })
})
