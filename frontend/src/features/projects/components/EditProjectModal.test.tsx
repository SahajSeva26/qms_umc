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
