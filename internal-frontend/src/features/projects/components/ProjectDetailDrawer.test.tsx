import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ProjectEntity } from '@/types/project.types'
import ProjectDetailDrawer from './ProjectDetailDrawer'

vi.mock('@/components/ui/SideDrawer', () => ({
  default: ({ open, title, children }: { open: boolean; title: string; children: React.ReactNode }) => open ? <div role="dialog" aria-label={title}>{children}</div> : null,
}))
vi.mock('./AddPurchaseOrderDialog', () => ({
  default: () => <div>Add purchase order dialog</div>,
}))

function projectFixture(): ProjectEntity {
  return {
    id: 'project-1', code: 'prj-000001', name: 'Heart Health',
    tenant: { _id: 'tenant-1', name: 'Sunrise Pharma', code: 'sunrise' },
    division: { _id: 'division-1', name: 'Cardio', code: 'cardio', therapy: [] },
    therapy: 'cardiology', type: ['screening'], tests: [], lead: null,
    executionMode: { mode: 'po', po: { purchaseOrders: [
      { number: 'PO/2026/002', date: '2026-09-01' },
      { number: 'PO/2026/001', date: '2026-04-18', expiry: '2027-04-18' },
    ] } },
    campCost: 70000, totalCamps: 120, gst: 18, valueBeforeGST: 8420000, additionalCost: 5000,
    campTimeSlots: ['9am-1pm'], freeCancelHours: 48, cancellationAllowed: 10,
    campCostDeductionOnChargableCancel: 25, goLiveScope: { code: 'pan', values: [] },
    whoCanBookCamp: ['pharma-mr'], salesRep: { _id: 'role-1', code: 'sales', name: 'Nikhil' },
    projectCoordinator: { _id: 'role-2', code: 'coord', name: 'Sneha' }, marketingContact: null,
    paymentTerms: 'net_30', status: 'live', stageHistory: [], daysToBookBefore: 7,
    effectiveEarliestSlot: '2026-10-30', dietChart: [], poRenewalReminder: 80,
    clientReportCandance: 'monthly', availablePointers: ['camp_executed'],
    tats: 'Reports within 48 hours', sops: 'Follow client SOP',
    createdAt: '2026-09-30', updatedAt: '2026-10-20', stats: { executedCamps: 84 },
  }
}

describe('ProjectDetailDrawer', () => {
  it('shows the real PO history and the additional project details available in the API', () => {
    render(<ProjectDetailDrawer project={projectFixture()} onClose={vi.fn()} canEdit={false} />)

    expect(screen.getByRole('table', { name: /purchase order history/i })).toBeInTheDocument()
    expect(screen.getAllByText('PO/2026/001')).toHaveLength(1)
    expect(screen.getAllByText('PO/2026/002')).toHaveLength(2)
    const currentPo = screen.getByRole('region', { name: /current execution po/i })
    expect(within(currentPo).getByText('PO/2026/002')).toBeInTheDocument()
    expect(screen.getByText('Current')).toBeInTheDocument()
    expect(screen.getByText('Camps done / total')).toBeInTheDocument()
    expect(screen.getByText('84 / 120')).toBeInTheDocument()
    expect(screen.getByText('Additional cost')).toBeInTheDocument()
    expect(screen.getByText('Free cancellation')).toBeInTheDocument()
    expect(screen.getByText('Client report cadence')).toBeInTheDocument()
    expect(screen.getByText('Report pointers')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add po/i })).not.toBeInTheDocument()
  })

  it('permission-gates Add PO and opens the add dialog for an editor', async () => {
    const user = userEvent.setup()
    render(<ProjectDetailDrawer project={projectFixture()} onClose={vi.fn()} canEdit />)

    await user.click(screen.getByRole('button', { name: /add po/i }))

    expect(screen.getByText('Add purchase order dialog')).toBeInTheDocument()
  })
})
