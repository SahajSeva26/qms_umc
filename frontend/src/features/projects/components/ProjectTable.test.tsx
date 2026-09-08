import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ProjectEntity } from '@/types/project.types'
import ProjectTable from './ProjectTable'

function projectFixture(overrides: Partial<ProjectEntity> = {}): ProjectEntity {
  return {
    id: 'proj-1', code: 'prj-000001', name: 'Test Project',
    tenant: 't-1', division: { _id: 'div-1', name: 'Div', code: 'div-1', therapy: [] },
    therapy: 'cardiology', type: ['screening_camp'], tests: [], lead: null, mode: null,
    campCost: 0, totalCamps: 0, gst: 0, valueBeforeGST: 0, additionalCost: 0,
    campTimeSlots: ['9am-1pm'], freeCancelHours: 0, cancellationAllowed: 0,
    campCostDeductionOnChargableCancel: 0, goLiveScope: null, whoCanBookCamp: [],
    salesRep: { _id: 'r-1', code: 'sr-1', name: 'Rep' }, projectCoordinator: { _id: 'r-2', code: 'pc-1', name: 'Coord' },
    marketingContact: { _id: 'c-1', name: 'Contact' }, paymentTerms: 'net_30', status: 'new', stageHistory: [],
    daysToBookBefore: 0, dietChart: [], poRenewalReminder: 0, availablePointers: [],
    tats: '', sops: '', createdAt: '', updatedAt: '', ...overrides,
  } as ProjectEntity
}

describe('ProjectTable — write-permission gating', () => {
  it('canWrite=false: the row menu has no Edit/Change status entries, and the status pill click never fires onChangeStatus', async () => {
    const onOpenDetail = vi.fn()
    const onEdit = vi.fn()
    const onChangeStatus = vi.fn()
    const user = userEvent.setup()

    render(
      <ProjectTable
        projects={[projectFixture()]}
        canWrite={false}
        onOpenDetail={onOpenDetail}
        onEdit={onEdit}
        onChangeStatus={onChangeStatus}
      />,
    )

    await user.click(screen.getByRole('button', { name: /project actions/i }))
    expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /change status/i })).not.toBeInTheDocument()

    await user.click(screen.getByText(/^new$/i))
    expect(onChangeStatus).not.toHaveBeenCalled()
  })

  it('canWrite=true: the row menu shows Edit/Change status, and clicking the status pill fires onChangeStatus', async () => {
    const onOpenDetail = vi.fn()
    const onEdit = vi.fn()
    const onChangeStatus = vi.fn()
    const user = userEvent.setup()

    render(
      <ProjectTable
        projects={[projectFixture()]}
        canWrite={true}
        onOpenDetail={onOpenDetail}
        onEdit={onEdit}
        onChangeStatus={onChangeStatus}
      />,
    )

    await user.click(screen.getByRole('button', { name: /project actions/i }))
    expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /change status/i })).toBeInTheDocument()

    await user.click(screen.getByText(/^new$/i))
    expect(onChangeStatus).toHaveBeenCalledWith('proj-1')
  })
})
