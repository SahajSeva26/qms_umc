import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const FIELD_OFFICER = {
  role: 'role-1', name: 'Asha Field Officer', code: 'FO-001',
  devicesHeld: 3, consumableUnitsHeld: 40, awaitingApproval: 0, awaitingReceipt: 0,
}

const getInventoryAssignmentReport = vi.fn(async () => ({
  success: true,
  message: '',
  data: {
    summary: { totalFieldOfficers: 1, fieldOfficersHoldingInventory: 1 },
    fieldOfficers: [FIELD_OFFICER],
  },
}))

vi.mock('@/features/inventory/real/inventoryAssignment.service', () => ({
  inventoryAssignmentService: {
    getInventoryAssignmentReport: () => getInventoryAssignmentReport(),
    searchInventoryAssignments: vi.fn(async () => ({ success: true, message: '', data: { count: 0, items: [] } })),
  },
}))

// Isolates this panel's own row-click/open-drawer wiring from the drawer's own
// internals, which FoInventoryDrawer.test.tsx already covers in full.
const foInventoryDrawerSpy = vi.fn()
vi.mock('@/features/inventory/real/components/FoInventoryDrawer', () => ({
  default: (props: { open: boolean; foRoleId: string; foName: string; foCode: string; onClose: () => void }) => {
    foInventoryDrawerSpy(props)
    return props.open ? <div aria-label="FO inventory drawer stub">{props.foName}</div> : null
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderPanel() {
  const InventoryFoInventoryPanel = (await import('./InventoryFoInventoryPanel')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <InventoryFoInventoryPanel />
    </QueryClientProvider>,
  )
}

describe('InventoryFoInventoryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getInventoryAssignmentReport.mockImplementation(async () => ({
      success: true,
      message: '',
      data: {
        summary: { totalFieldOfficers: 1, fieldOfficersHoldingInventory: 1 },
        fieldOfficers: [FIELD_OFFICER],
      },
    }))
  })

  it('opens the FO inventory drawer for the clicked row, with that row\'s identity', async () => {
    const user = userEvent.setup()
    await renderPanel()

    expect(screen.queryByLabelText('FO inventory drawer stub')).not.toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: 'Asha Field Officer' }))

    expect(await screen.findByLabelText('FO inventory drawer stub')).toBeInTheDocument()
    expect(foInventoryDrawerSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ open: true, foRoleId: 'role-1', foName: 'Asha Field Officer', foCode: 'FO-001' }),
    )
  })
})
