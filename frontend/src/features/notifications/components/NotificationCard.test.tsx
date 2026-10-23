import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import NotificationCard from './NotificationCard'
import { useSession } from '@/hooks/useSession'
import type { NotificationEntityItem } from '@/features/notifications/notifications.types'

vi.mock('@/hooks/useSession')

function sessionFixture(roleTypeCode: string | null, hasAnyPermission?: (codes: string[]) => boolean) {
  return {
    session: roleTypeCode ? { roleType: { code: roleTypeCode } } : null,
    hasAnyPermission,
  } as unknown as ReturnType<typeof useSession>
}

function sessionFixtureWithPermissions(roleTypeCode: string, hasAnyPermission: (codes: string[]) => boolean) {
  return {
    session: { roleType: { code: roleTypeCode } },
    hasAnyPermission,
  } as unknown as ReturnType<typeof useSession>
}

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

function renderCard(roleTypeCode: string | null, hasAnyPermission?: (codes: string[]) => boolean) {
  vi.mocked(useSession).mockReturnValue(sessionFixture(roleTypeCode, hasAnyPermission))
  return render(
    <MemoryRouter initialEntries={['/pharma/mr']}>
      <Routes>
        <Route path="*" element={<NotificationCard notification={notificationFixture()} />} />
        <Route path="/camps" element={<div>Camps page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

// /camps?camp=<id> is unreachable for pharma roles (AppLayout force-redirects them) — except
// the pharma field-force (MR/ASM/RSM), which has its own exception onto the combined Camp
// Management page. pharma-division-head is not field-force and stays inert.
describe('NotificationCard — pharma-role click destination', () => {
  it('renders as a clickable button and navigates for a non-pharma role', async () => {
    const user = userEvent.setup()
    renderCard('camp-coord')

    const button = screen.getByRole('button')
    await user.click(button)

    expect(await screen.findByText('Camps page')).toBeInTheDocument()
  })

  it('renders inert (no button) for pharma-division-head, since /camps is unreachable for it', () => {
    renderCard('pharma-division-head')

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText('A new camp has been created')).toBeInTheDocument()
  })

  it.each(['pharma-mr', 'pharma-asm', 'pharma-rsm'])(
    'renders clickable and navigates to Camps for %s, the pharma field-force exception',
    async (roleTypeCode) => {
      const user = userEvent.setup()
      renderCard(roleTypeCode)

      const button = screen.getByRole('button')
      await user.click(button)

      expect(await screen.findByText('Camps page')).toBeInTheDocument()
    },
  )

  // A field-force session without camp:book is real and supported (its sidebar link correctly
  // disables — see Sidebar.test.tsx) — /camps still 403s for it, so the card must stay inert
  // rather than deep-linking into /unauthorized.
  it.each(['pharma-mr', 'pharma-asm', 'pharma-rsm'])(
    'renders inert (no button) for %s when it lacks camp:book, even though it is pharma field-force',
    (roleTypeCode) => {
      const hasAnyPermission = () => false
      renderCard(roleTypeCode, hasAnyPermission)

      expect(screen.queryByRole('button')).not.toBeInTheDocument()
      expect(screen.getByText('A new camp has been created')).toBeInTheDocument()
    },
  )

  it('still renders clickable when session has not resolved yet (roleTypeCode undefined)', async () => {
    const user = userEvent.setup()
    renderCard(null)

    const button = screen.getByRole('button')
    await user.click(button)

    expect(await screen.findByText('Camps page')).toBeInTheDocument()
  })
})

function projectNotificationFixture(): NotificationEntityItem {
  return {
    id: 'n-2',
    entity: { id: 'proj-1', type: 'project', event: 'create' },
    event: 'project.create',
    channel: 'in-app',
    subject: 'A new project has been created',
    body: 'Project prj-000001 created.',
    status: 'sent',
    sentAt: '2026-10-19T00:00:00Z',
    read: false,
    readAt: null,
    createdAt: '2026-10-19T00:00:00Z',
    updatedAt: '2026-10-19T00:00:00Z',
  }
}

function renderProjectCard(roleTypeCode: string, hasAnyPermission: (codes: string[]) => boolean) {
  vi.mocked(useSession).mockReturnValue(sessionFixtureWithPermissions(roleTypeCode, hasAnyPermission))
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="*" element={<NotificationCard notification={projectNotificationFixture()} />} />
        <Route path="/projects" element={<div>Projects page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

// A project notification is gated on PROJECTS_VIEW_PERMISSIONS (see entityResolver.ts).
describe('NotificationCard — project notification permission gating', () => {
  it('renders inert when the viewer lacks the required permission', () => {
    const hasAnyPermission = () => false
    renderProjectCard('camp-coordinator-diet', hasAnyPermission)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders clickable when the viewer holds the permission', async () => {
    const user = userEvent.setup()
    const hasAnyPermission = (codes: string[]) => codes.includes('project:search')
    renderProjectCard('sales-rep', hasAnyPermission)

    const button = screen.getByRole('button')
    await user.click(button)

    expect(await screen.findByText('Projects page')).toBeInTheDocument()
  })
})
