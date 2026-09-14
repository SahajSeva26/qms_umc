import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import type { ProjectEntity } from '@/types/project.types'

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    searchTenants: vi.fn(async () => ({ success: true, message: '', data: { items: [{ id: 't-1', code: 'qms', name: 'QMS', type: 'platform' }], count: 1 } })),
    searchRoleTypes: vi.fn(async () => ({ success: true, message: '', data: { items: [{ id: 'rt-1', code: 'sales-rep' }], count: 1 } })),
    searchRoles: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))

vi.mock('@/features/contacts/contacts.service', () => ({
  contactsService: {
    searchContacts: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))

vi.mock('@/features/projects/projects.service', () => ({
  projectsService: {
    updateProject: vi.fn(),
  },
}))

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

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderModal(project: ProjectEntity, onClose = vi.fn()) {
  const EditProjectModal = (await import('./EditProjectModal')).default
  const queryClient = makeQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <EditProjectModal project={project} onClose={onClose} />
    </QueryClientProvider>,
  )
}

describe('EditProjectModal — save failure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a toast and keeps the dialog open when the update mutation rejects', async () => {
    const { projectsService } = await import('@/features/projects/projects.service')
    vi.mocked(projectsService.updateProject).mockRejectedValue(new Error('network error'))

    const onClose = vi.fn()
    const user = userEvent.setup()
    await renderModal(projectFixture(), onClose)

    await screen.findByText(/edit project/i)
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Could not save changes — try again.'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes the dialog on a successful save', async () => {
    const { projectsService } = await import('@/features/projects/projects.service')
    vi.mocked(projectsService.updateProject).mockResolvedValue({ success: true, message: '', data: projectFixture() })

    const onClose = vi.fn()
    const user = userEvent.setup()
    await renderModal(projectFixture(), onClose)

    await screen.findByText(/edit project/i)
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(toast.error).not.toHaveBeenCalled()
  })
})

describe('EditProjectModal — partial update payload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saving without touching any field omits name/therapy/paymentTerms — never resends a stale snapshot to clobber a concurrent edit', async () => {
    const { projectsService } = await import('@/features/projects/projects.service')
    vi.mocked(projectsService.updateProject).mockResolvedValue({ success: true, message: '', data: projectFixture() })
    const user = userEvent.setup()
    await renderModal(projectFixture({ name: 'STALE-NAME', therapy: 'cardiology', paymentTerms: 'net_30' }))

    await screen.findByText(/edit project/i)
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(projectsService.updateProject).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload).not.toHaveProperty('name')
    expect(payload).not.toHaveProperty('therapy')
    expect(payload).not.toHaveProperty('paymentTerms')
  })

  it('editing project name directly includes only name in the payload', async () => {
    const { projectsService } = await import('@/features/projects/projects.service')
    vi.mocked(projectsService.updateProject).mockResolvedValue({ success: true, message: '', data: projectFixture() })
    const user = userEvent.setup()
    await renderModal(projectFixture({ name: 'OLD-NAME', paymentTerms: 'net_30' }))

    await screen.findByText(/edit project/i)
    const nameInput = screen.getByDisplayValue('OLD-NAME')
    await user.clear(nameInput)
    await user.type(nameInput, 'NEW-NAME')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(projectsService.updateProject).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload.name).toBe('NEW-NAME')
    expect(payload).not.toHaveProperty('paymentTerms')
  })

  it('editing payment terms directly includes only paymentTerms, leaving the untouched name out', async () => {
    const { projectsService } = await import('@/features/projects/projects.service')
    vi.mocked(projectsService.updateProject).mockResolvedValue({ success: true, message: '', data: projectFixture() })
    const user = userEvent.setup()
    await renderModal(projectFixture({ name: 'STALE-NAME', paymentTerms: 'net_30' }))

    await screen.findByText(/edit project/i)
    // Payment terms is the last combobox in the form; its SelectValue has no
    // render fn so it displays the raw value text.
    const comboboxes = screen.getAllByRole('combobox')
    await user.click(comboboxes[comboboxes.length - 1])
    const option = await screen.findByText('Net 60')
    await user.click(option)
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(projectsService.updateProject).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload.paymentTerms).toBe('net_60')
    expect(payload).not.toHaveProperty('name')
  })

  it('editing name then reverting to its exact original value omits it from the payload', async () => {
    const { projectsService } = await import('@/features/projects/projects.service')
    vi.mocked(projectsService.updateProject).mockResolvedValue({ success: true, message: '', data: projectFixture() })
    const user = userEvent.setup()
    await renderModal(projectFixture({ name: 'ORIGINAL-NAME', paymentTerms: 'net_30' }))

    await screen.findByText(/edit project/i)
    const nameInput = screen.getByDisplayValue('ORIGINAL-NAME')
    await user.clear(nameInput)
    await user.type(nameInput, 'TEMP-NAME')
    await user.clear(nameInput)
    await user.type(nameInput, 'ORIGINAL-NAME')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(projectsService.updateProject).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload).not.toHaveProperty('name')
  })

  it('toggling a camp time slot off then back on omits campTimeSlots from the payload', async () => {
    const { projectsService } = await import('@/features/projects/projects.service')
    vi.mocked(projectsService.updateProject).mockResolvedValue({ success: true, message: '', data: projectFixture() })
    const user = userEvent.setup()
    await renderModal(projectFixture({ campTimeSlots: ['9am-1pm'], paymentTerms: 'net_30' }))

    await screen.findByText(/edit project/i)
    const slotChip = screen.getByText('9 AM – 1 PM')
    await user.click(slotChip)
    await user.click(slotChip)
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(projectsService.updateProject).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload).not.toHaveProperty('campTimeSlots')
  })
})
