import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { SessionResponse } from '@/types/accessManagement.types'

vi.mock('@/hooks/useSession')
// Stable reference required: Sidebar.tsx's effect depends on `user` by
// reference; a fresh object per call would re-fire it every render and infinite-loop the test.
const MOCK_AUTH_USER = { id: 'u-1' }
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: MOCK_AUTH_USER }) }))

function sessionFixture(roleTypeCode: string, permissions: string[], tenantType: 'customer' | 'platform' = 'customer'): SessionResponse {
  return {
    user: { id: 'u-1', email: 'a@example.com', firstName: 'a', lastName: 'b' },
    role: { id: 'role-1', code: 'role-code', name: 'Role' },
    roleType: { id: 'rt-1', code: roleTypeCode, name: roleTypeCode },
    tenant: { id: 't-1', code: 'tenant-1', name: 'Tenant', type: tenantType },
    permissions,
  } as unknown as SessionResponse
}

async function renderSidebar(overrides: Record<string, unknown>) {
  const { useSession } = await import('@/hooks/useSession')
  vi.mocked(useSession).mockReturnValue({
    isSettled: true,
    permissions: [],
    session: null,
    ...overrides,
  } as unknown as ReturnType<typeof useSession>)

  const Sidebar = (await import('./Sidebar')).default
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Sidebar collapsed={false} onToggle={() => {}} />
    </MemoryRouter>,
  )
}

describe('Sidebar — pharma identity isolation', () => {
  it('never shows the Pharma Portal item for a system:manage session', async () => {
    await renderSidebar({
      permissions: ['system:manage'],
      session: sessionFixture('system-admin', ['system:manage']),
    })

    expect(screen.queryByText(/pharma portal/i)).not.toBeInTheDocument()
    expect(screen.getByText('CRM')).toBeInTheDocument()
  })

  it('shows ONLY the Pharma Portal section for a pharma-identity session with camp:book — no other section', async () => {
    await renderSidebar({
      permissions: ['camp:book'],
      session: sessionFixture('pharma-rsm', ['camp:book']),
    })

    expect(screen.getByText('Pharma Portal RSM')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
    expect(screen.queryByText('CRM')).not.toBeInTheDocument()
    expect(screen.queryByText('Client Management')).not.toBeInTheDocument()
  })

  it('misconfigured pharma role (no camp:book) still shows ONLY the Pharma Portal section, item rendered but non-navigable with the access-config message', async () => {
    await renderSidebar({
      permissions: [],
      session: sessionFixture('pharma-asm', []),
    })

    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
    expect(screen.queryByText('CRM')).not.toBeInTheDocument()

    const disabledItem = screen.getByText('Pharma Portal ASM').closest('[aria-disabled="true"]')
    expect(disabledItem).not.toBeNull()
    expect(screen.getByText(/access not configured/i)).toBeInTheDocument()
    expect(disabledItem?.querySelector('a')).toBeNull()
  })

  it('a normal QMS session with no special permissions sees the full nav minus System, and no Pharma Portal item', async () => {
    await renderSidebar({
      permissions: [],
      session: sessionFixture('sales-rep', []),
    })

    expect(screen.getByText('Doctor Management')).toBeInTheDocument()
    expect(screen.queryByText(/pharma portal/i)).not.toBeInTheDocument()
  })
})

describe('Sidebar — FO Management platform-tenant gate (unreachable via nav while the item is hidden, but must not silently break)', () => {
  it('hides both FO Management and Mock FO Management for a customer-tenant admin holding tenant:manage (the exact false-positive this gate exists to prevent)', async () => {
    await renderSidebar({
      permissions: ['tenant:manage'],
      session: sessionFixture('admin', ['tenant:manage'], 'customer'),
    })

    expect(screen.queryByText('FO Management')).not.toBeInTheDocument()
    expect(screen.queryByText('Mock FO Management')).not.toBeInTheDocument()
  })

  it('hides both FO Management and Mock FO Management for a platform-tenant session with neither tenant:manage nor tenant:admin', async () => {
    await renderSidebar({
      permissions: [],
      session: sessionFixture('sales-rep', [], 'platform'),
    })

    expect(screen.queryByText('FO Management')).not.toBeInTheDocument()
    expect(screen.queryByText('Mock FO Management')).not.toBeInTheDocument()
  })

  it('shows the real FO Management but keeps Mock FO Management nav-hidden for a platform-tenant session with tenant:admin', async () => {
    await renderSidebar({
      permissions: ['tenant:admin'],
      session: sessionFixture('admin', ['tenant:admin'], 'platform'),
    })

    expect(screen.getByText('FO Management')).toBeInTheDocument()
    expect(screen.queryByText('Mock FO Management')).not.toBeInTheDocument()
  })
})

describe('Sidebar — Inventory Operations nav label mirrors the page\'s own "Requests-only" state', () => {
  it('labels the nav item "Requests" for a field-officer-shaped session (only inventory-request:* permissions)', async () => {
    await renderSidebar({
      permissions: ['inventory-request:search', 'inventory-request:create'],
      session: sessionFixture('field-officer', ['inventory-request:search', 'inventory-request:create'], 'platform'),
    })

    expect(screen.getByText('Requests')).toBeInTheDocument()
    expect(screen.queryByText('Inventory Operations')).not.toBeInTheDocument()
  })

  it('keeps the "Inventory Operations" label for a session holding inventory-assignment:manage', async () => {
    await renderSidebar({
      permissions: ['inventory-assignment:manage'],
      session: sessionFixture('inventory-manager', ['inventory-assignment:manage']),
    })

    expect(screen.getByText('Inventory Operations')).toBeInTheDocument()
    expect(screen.queryByText('Requests')).not.toBeInTheDocument()
  })

  it('keeps the "Inventory Operations" label for a system:manage session, even though it holds no explicit inventory-assignment/-ledger code', async () => {
    await renderSidebar({
      permissions: ['system:manage'],
      session: sessionFixture('system-admin', ['system:manage']),
    })

    expect(screen.getByText('Inventory Operations')).toBeInTheDocument()
    expect(screen.queryByText('Requests')).not.toBeInTheDocument()
  })
})

describe('Sidebar — Field Staff Coverage is hidden from field-officer sessions', () => {
  it('hides Field Staff Coverage for a field-officer-shaped session (holds neither tenant nor role read/manage codes)', async () => {
    await renderSidebar({
      permissions: ['inventory-request:search', 'inventory-request:create'],
      session: sessionFixture('field-officer', ['inventory-request:search', 'inventory-request:create'], 'platform'),
    })

    expect(screen.queryByText('Field Staff Coverage')).not.toBeInTheDocument()
  })

  it('shows Field Staff Coverage for a sales-rep session holding tenant:search/tenant:get', async () => {
    await renderSidebar({
      permissions: ['tenant:search', 'tenant:get'],
      session: sessionFixture('sales-rep', ['tenant:search', 'tenant:get'], 'platform'),
    })

    expect(screen.getByText('Field Staff Coverage')).toBeInTheDocument()
  })

  it('shows Field Staff Coverage for a system:manage session even without an explicit tenant/role code', async () => {
    await renderSidebar({
      permissions: ['system:manage'],
      session: sessionFixture('system-admin', ['system:manage']),
    })

    expect(screen.getByText('Field Staff Coverage')).toBeInTheDocument()
  })
})
