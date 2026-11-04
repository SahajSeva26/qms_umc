import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FiBox } from 'react-icons/fi'
import type { NotificationEntityItem } from '@qms/core'
import NotificationCard from './NotificationCard'
import type { EntityResolution } from './notifications.entityResolver'

function notificationFixture(overrides: Partial<NotificationEntityItem> = {}): NotificationEntityItem {
  return {
    id: 'n-1',
    entity: { id: 'camp-1', type: 'camp', event: 'create' },
    event: 'camp.create',
    channel: 'in-app',
    subject: 'A new camp has been created',
    body: 'New screening camp cmp-000016 booked.',
    status: 'sent',
    sentAt: '2026-10-19T00:00:00Z',
    read: false,
    readAt: null,
    createdAt: '2026-10-19T00:00:00Z',
    updatedAt: '2026-10-19T00:00:00Z',
    ...overrides,
  }
}

const resolvedCamp: EntityResolution = { icon: FiBox, label: 'Camp', href: (id) => `/camps?camp=${id}` }

describe('NotificationCard', () => {
  it('renders as a clickable button and calls onNavigate with the resolved href when resolveEntity resolves', async () => {
    const onNavigate = vi.fn()
    const resolveEntity = vi.fn(() => resolvedCamp)
    const user = userEvent.setup()

    render(<NotificationCard notification={notificationFixture()} resolveEntity={resolveEntity} onNavigate={onNavigate} />)

    const button = screen.getByRole('button')
    await user.click(button)

    expect(onNavigate).toHaveBeenCalledWith('/camps?camp=camp-1')
  })

  it('renders inert (no button) when resolveEntity returns null — never builds a URL from an unresolved entity', () => {
    const resolveEntity = vi.fn(() => null)

    render(<NotificationCard notification={notificationFixture()} resolveEntity={resolveEntity} onNavigate={vi.fn()} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText('A new camp has been created')).toBeInTheDocument()
  })

  it('passes roleTypeCode and hasAnyPermission through to resolveEntity unchanged', () => {
    const hasAnyPermission = () => true
    const resolveEntity = vi.fn(() => resolvedCamp)

    render(
      <NotificationCard
        notification={notificationFixture()}
        resolveEntity={resolveEntity}
        roleTypeCode="pharma-mr"
        hasAnyPermission={hasAnyPermission}
        onNavigate={vi.fn()}
      />,
    )

    expect(resolveEntity).toHaveBeenCalledWith(notificationFixture().entity, 'pharma-mr', hasAnyPermission)
  })

  it('shows the unread indicator only when the notification is unread', () => {
    const resolveEntity = vi.fn(() => resolvedCamp)
    const { rerender } = render(
      <NotificationCard notification={notificationFixture({ read: false })} resolveEntity={resolveEntity} onNavigate={vi.fn()} />,
    )
    expect(screen.getByLabelText('Unread')).toBeInTheDocument()

    rerender(<NotificationCard notification={notificationFixture({ read: true })} resolveEntity={resolveEntity} onNavigate={vi.fn()} />)
    expect(screen.queryByLabelText('Unread')).not.toBeInTheDocument()
  })

  it('the "full" variant renders the resolved entity label and an untruncated body', () => {
    const resolveEntity = vi.fn(() => resolvedCamp)

    render(
      <NotificationCard
        notification={notificationFixture()}
        resolveEntity={resolveEntity}
        onNavigate={vi.fn()}
        variant="full"
      />,
    )

    expect(screen.getByText('Camp')).toBeInTheDocument()
    expect(screen.getByText('New screening camp cmp-000016 booked.')).toBeInTheDocument()
  })
})
