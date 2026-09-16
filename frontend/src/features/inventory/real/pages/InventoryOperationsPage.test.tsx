import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/hooks/usePermission')

vi.mock('@/features/inventory/real/components/InventoryAssignmentsPanel', () => ({
  default: () => <div>Assignments panel content</div>,
}))
vi.mock('@/features/inventory/real/components/InventoryRequestsPanel', () => ({
  default: () => <div>Requests panel content</div>,
}))
vi.mock('@/features/inventory/real/components/InventoryLedgerPanel', () => ({
  default: () => <div>Ledger panel content</div>,
}))

async function renderPage(hasAnyPermission: (perms: string[]) => boolean) {
  const { usePermission } = await import('@/hooks/usePermission')
  vi.mocked(usePermission).mockReturnValue({ hasAnyPermission } as unknown as ReturnType<typeof usePermission>)
  const InventoryOperationsPage = (await import('./InventoryOperationsPage')).default
  return render(<InventoryOperationsPage />)
}

describe('InventoryOperationsPage — tab visibility mirrors the same :manage boundary the backend enforces', () => {
  it('a full-access viewer sees all three tabs, the "Inventory Operations" title, and defaults to Assignments', async () => {
    await renderPage(() => true)

    expect(screen.getByRole('heading', { name: /^inventory operations$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^assignments$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^requests$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^ledger$/i })).toBeInTheDocument()
    expect(screen.getByText('Assignments panel content')).toBeInTheDocument()
  })

  it('a field-officer-shaped viewer (only inventory-request:* permissions) sees a plain "Requests" page — no toggle group, no Assignments/Ledger buttons, and Requests is the only content shown', async () => {
    await renderPage((perms) => perms.every((p) => p.startsWith('inventory-request:')))

    expect(screen.getByRole('heading', { name: /^requests$/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^assignments$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^requests$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^ledger$/i })).not.toBeInTheDocument()
    expect(screen.getByText('Requests panel content')).toBeInTheDocument()
  })

  it('a viewer who somehow holds only inventory-ledger:manage sees Ledger and Requests, not Assignments, and still defaults to Requests', async () => {
    await renderPage((perms) => perms.includes('inventory-ledger:manage'))

    expect(screen.queryByRole('button', { name: /^assignments$/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^requests$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^ledger$/i })).toBeInTheDocument()
    expect(screen.getByText('Requests panel content')).toBeInTheDocument()
  })

  it('switching to a visible tab still works normally for a scoped viewer', async () => {
    const user = userEvent.setup()
    await renderPage((perms) => perms.includes('inventory-ledger:manage'))

    await user.click(screen.getByRole('button', { name: /^ledger$/i }))
    expect(screen.getByText('Ledger panel content')).toBeInTheDocument()
    expect(screen.queryByText('Requests panel content')).not.toBeInTheDocument()
  })
})
