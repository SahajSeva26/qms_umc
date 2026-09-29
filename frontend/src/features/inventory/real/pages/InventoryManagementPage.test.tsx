import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { ADMIN_ROUTES } from '@/features/admin/admin.routes'

vi.mock('@/hooks/usePermission')

vi.mock('@/features/inventory/real/components/InventoryOverviewPanel', () => ({ default: () => <div>Overview panel content</div> }))
vi.mock('@/features/inventory/real/components/InventoryMasterTab', () => ({ default: () => <div>Item Master panel content</div> }))
vi.mock('@/features/inventory/real/components/InventoryDevicesPanel', () => ({ default: () => <div>Devices panel content</div> }))
vi.mock('@/features/inventory/real/components/InventoryConsumablesPanel', () => ({ default: () => <div>Consumables panel content</div> }))
vi.mock('@/features/inventory/real/components/InventoryExpiryPanel', () => ({ default: () => <div>Expiry panel content</div> }))
vi.mock('@/features/inventory/real/components/InventoryCalibrationPanel', () => ({ default: () => <div>Calibration panel content</div> }))
vi.mock('@/features/inventory/real/components/InventoryAssignmentsPanel', () => ({ default: () => <div>Assignments panel content</div> }))
vi.mock('@/features/inventory/real/components/InventoryFoInventoryPanel', () => ({ default: () => <div>FO Inventory panel content</div> }))
vi.mock('@/features/inventory/real/components/InventoryRequestsPanel', () => ({ default: () => <div>Requests panel content</div> }))
vi.mock('@/features/inventory/real/components/InventoryLedgerPanel', () => ({ default: () => <div>Movements panel content</div> }))
vi.mock('@/features/inventory/real/components/InventoryVendorsPanel', () => ({ default: () => <div>Vendors panel content</div> }))
// InventoryPageShell pulls in useInventoryOverviewKpis, which hits 5 real
// report endpoints — stubbed so this file stays a pure page-wiring test.
vi.mock('@/features/inventory/real/hooks/useInventoryOverviewKpis', () => ({
  useInventoryOverviewKpis: () => ({ tiles: [], isLoading: false, hasError: false, canViewAny: false }),
}))

function LocationSpy({ onChange }: { onChange: (search: string) => void }) {
  onChange(useLocation().search)
  return null
}

async function renderPage(hasAnyPermission: (perms: string[]) => boolean, initialPath = ADMIN_ROUTES.ADMIN_INVENTORY, onLocationChange?: (search: string) => void) {
  const { usePermission } = await import('@/hooks/usePermission')
  vi.mocked(usePermission).mockReturnValue({ hasAnyPermission } as unknown as ReturnType<typeof usePermission>)
  const InventoryManagementPage = (await import('./InventoryManagementPage')).default
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <InventoryManagementPage />
      {onLocationChange && <LocationSpy onChange={onLocationChange} />}
    </MemoryRouter>,
  )
}

// One page, one route — most tabs are unconditional (open reads); Assignments/FO Inventory/Requests/
// Movements/Vendor Master are shown only when the viewer holds the real permission their read requires.
describe('InventoryManagementPage — one page, tabs gated by real per-area permissions', () => {
  it('a full-access viewer sees all 11 tabs and defaults to Overview', async () => {
    await renderPage(() => true)

    for (const label of ['Overview', 'Item Master', 'Devices', 'Consumables', 'Expiry / FEFO', 'Calibration', 'Assignments', 'FO Inventory', 'Requests', 'Movements', 'Vendor Master']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${label}$`, 'i') })).toBeInTheDocument()
    }
    expect(screen.getByText('Overview panel content')).toBeInTheDocument()
  })

  it('a field-officer-shaped viewer (only inventory-request:* permissions) sees Overview/Item Master/Devices/Consumables/Expiry/Calibration/Requests, not Assignments/FO Inventory/Movements/Vendor Master', async () => {
    await renderPage((perms) => perms.every((p) => p.startsWith('inventory-request:')))

    for (const label of ['Overview', 'Item Master', 'Devices', 'Consumables', 'Expiry / FEFO', 'Calibration', 'Requests']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${label}$`, 'i') })).toBeInTheDocument()
    }
    for (const label of ['Assignments', 'FO Inventory', 'Movements', 'Vendor Master']) {
      expect(screen.queryByRole('button', { name: new RegExp(`^${label}$`, 'i') })).not.toBeInTheDocument()
    }
  })

  it('a viewer with inventory-assignment:manage sees both Assignments and FO Inventory — they share one permission gate', async () => {
    await renderPage((perms) => perms.includes('inventory-assignment:manage'))

    expect(screen.getByRole('button', { name: /^assignments$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^fo inventory$/i })).toBeInTheDocument()
  })

  it('clicking a visible tab switches the panel and updates the URL', async () => {
    const user = userEvent.setup()
    await renderPage(() => true)

    await user.click(screen.getByRole('button', { name: /^devices$/i }))
    expect(screen.getByText('Devices panel content')).toBeInTheDocument()
    expect(screen.queryByText('Overview panel content')).not.toBeInTheDocument()
  })

  it('deep-linking straight to ?view=movements shows the Movements panel without clicking anything', async () => {
    await renderPage(() => true, `${ADMIN_ROUTES.ADMIN_INVENTORY}?view=movements`)

    expect(screen.getByText('Movements panel content')).toBeInTheDocument()
    expect(screen.queryByText('Overview panel content')).not.toBeInTheDocument()
  })

  it('a ?view= the viewer cannot reach falls back to Overview, not a blank or errored panel', async () => {
    await renderPage((perms) => perms.every((p) => p.startsWith('inventory-request:')), `${ADMIN_ROUTES.ADMIN_INVENTORY}?view=movements`)

    expect(screen.getByText('Overview panel content')).toBeInTheDocument()
    expect(screen.queryByText('Movements panel content')).not.toBeInTheDocument()
  })

  // Regression: inventory-request:create is independent of :search/:manage on
  // the backend — a create-only requester (e.g. an FO) must still see the tab.
  it('a viewer with only inventory-request:create (no :search, no :manage) still sees the Requests tab', async () => {
    await renderPage((perms) => perms.includes('inventory-request:create'))

    expect(screen.getByRole('button', { name: /^requests$/i })).toBeInTheDocument()
  })

  // Regression: the shell used to call navigate() itself too, dropping other query params.
  it('clicking a tab preserves an unrelated existing query param instead of wiping it', async () => {
    const user = userEvent.setup()
    let currentSearch = ''
    await renderPage(() => true, `${ADMIN_ROUTES.ADMIN_INVENTORY}?foo=bar`, (s) => { currentSearch = s })

    await user.click(screen.getByRole('button', { name: /^devices$/i }))

    expect(screen.getByText('Devices panel content')).toBeInTheDocument()
    await vi.waitFor(() => {
      expect(currentSearch).toContain('foo=bar')
      expect(currentSearch).toContain('view=devices')
    })
  })
})
