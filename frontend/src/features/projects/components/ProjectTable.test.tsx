import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ProjectEntity } from '@/types/project.types'
import ProjectTable from './ProjectTable'

function projectFixture(overrides: Partial<ProjectEntity> = {}): ProjectEntity {
  return {
    id: 'proj-1', code: 'prj-000001', name: 'Test Project',
    tenant: 't-1', division: { _id: 'div-1', name: 'Div', code: 'div-1', therapy: [] },
    therapy: 'cardiology', type: ['screening'], tests: [], lead: null, executionMode: null,
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
    const onVoidCamps = vi.fn()
    const user = userEvent.setup()

    render(
      <ProjectTable
        projects={[projectFixture()]}
        canWrite={false}
        canManageVoidCamps={false}
        onOpenDetail={onOpenDetail}
        onEdit={onEdit}
        onChangeStatus={onChangeStatus}
        onVoidCamps={onVoidCamps}
      />,
    )

    await user.click(screen.getByRole('button', { name: /project actions/i }))
    expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /change status/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add void camp/i })).not.toBeInTheDocument()

    await user.click(screen.getByText(/^new$/i))
    expect(onChangeStatus).not.toHaveBeenCalled()
  })

  it('canWrite=true: the row menu shows Edit/Change status/Add void camp, and clicking the status pill fires onChangeStatus', async () => {
    const onOpenDetail = vi.fn()
    const onEdit = vi.fn()
    const onChangeStatus = vi.fn()
    const onVoidCamps = vi.fn()
    const user = userEvent.setup()

    render(
      <ProjectTable
        projects={[projectFixture()]}
        canWrite={true}
        canManageVoidCamps={true}
        onOpenDetail={onOpenDetail}
        onEdit={onEdit}
        onChangeStatus={onChangeStatus}
        onVoidCamps={onVoidCamps}
      />,
    )

    await user.click(screen.getByRole('button', { name: /project actions/i }))
    expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /change status/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add void camp/i })).toBeInTheDocument()

    await user.click(screen.getByText(/^new$/i))
    expect(onChangeStatus).toHaveBeenCalledWith('proj-1')
  })

  it('canWrite=true: clicking "Add void camp" fires onVoidCamps with the project id', async () => {
    const onVoidCamps = vi.fn()
    const user = userEvent.setup()

    render(
      <ProjectTable
        projects={[projectFixture()]}
        canWrite={true}
        canManageVoidCamps={true}
        onOpenDetail={vi.fn()}
        onEdit={vi.fn()}
        onChangeStatus={vi.fn()}
        onVoidCamps={onVoidCamps}
      />,
    )

    await user.click(screen.getByRole('button', { name: /project actions/i }))
    await user.click(screen.getByRole('button', { name: /add void camp/i }))

    expect(onVoidCamps).toHaveBeenCalledWith('proj-1')
  })

  it('canWrite=true but canManageVoidCamps=false: Edit/Change status still show, but Add void camp does not', async () => {
    const user = userEvent.setup()

    render(
      <ProjectTable
        projects={[projectFixture()]}
        canWrite={true}
        canManageVoidCamps={false}
        onOpenDetail={vi.fn()}
        onEdit={vi.fn()}
        onChangeStatus={vi.fn()}
        onVoidCamps={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /project actions/i }))
    expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /change status/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add void camp/i })).not.toBeInTheDocument()
  })

  it('canWrite=false but canManageVoidCamps=true: Add void camp shows even without project write access', async () => {
    const user = userEvent.setup()

    render(
      <ProjectTable
        projects={[projectFixture()]}
        canWrite={false}
        canManageVoidCamps={true}
        onOpenDetail={vi.fn()}
        onEdit={vi.fn()}
        onChangeStatus={vi.fn()}
        onVoidCamps={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /project actions/i }))
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add void camp/i })).toBeInTheDocument()
  })

  it('canManageVoidCamps=true but the project type supports no camp types (teleconsultation-only): Add void camp is hidden', async () => {
    const user = userEvent.setup()

    render(
      <ProjectTable
        projects={[projectFixture({ type: ['teleconsultation_diet'] })]}
        canWrite={true}
        canManageVoidCamps={true}
        onOpenDetail={vi.fn()}
        onEdit={vi.fn()}
        onChangeStatus={vi.fn()}
        onVoidCamps={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /project actions/i }))
    expect(screen.queryByRole('button', { name: /add void camp/i })).not.toBeInTheDocument()
  })
})
