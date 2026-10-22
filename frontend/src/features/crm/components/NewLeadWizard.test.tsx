import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAuthStore } from '@/features/auth/store'
import type { ApiResponse } from '@/types/common.types'
import type { SessionResponse } from '@/types/accessManagement.types'
import NewLeadWizard from './NewLeadWizard'

const sessionResponse: ApiResponse<SessionResponse> = {
  success: true,
  message: '',
  data: {
    user: { id: 'user-1', email: 'system@gmail.com', firstName: 'System', lastName: 'User' },
    role: { id: 'role-1', code: 'system', name: 'System' },
    roleType: { id: 'rt-1', code: 'system', name: 'System' },
    tenant: { id: 'tenant-1', code: 'qms', name: 'QMS', type: 'platform' },
    permissions: ['system:manage'],
  },
}

vi.mock('@/features/crm/crm.service', () => ({
  crmService: {
    searchLeads: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
    createLead: vi.fn(async () => ({ success: true, message: '', data: { id: 'new-lead-id' } })),
  },
}))
vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    getMe: vi.fn(async () => sessionResponse),
  },
}))
vi.mock('@/features/access-management/tenant/hooks/useTenants', () => ({
  useTenants: vi.fn(() => ({ data: { data: { items: [{ id: 'platform-1', name: 'QMS', code: 'qms', type: 'platform' }], count: 1 } }, isLoading: false, isError: false })),
}))
vi.mock('@/features/access-management/role-type/hooks/useRoleTypes', () => ({
  useRoleTypes: vi.fn(() => ({ data: { data: { items: [{ id: 'rt-sales-rep', code: 'sales-rep', name: 'Sales Rep' }], count: 1 } }, isLoading: false, isError: false })),
}))
vi.mock('@/features/access-management/role/hooks/useRoles', () => ({
  // Args-aware, not a static return — WizardStep4 makes two useRoles() calls
  // and a static mock would produce a duplicate React key for both.
  useRoles: vi.fn((_query: unknown, enabled?: boolean) =>
    enabled === false
      ? { data: { data: { items: [], count: 0 } }, isLoading: false, isError: false }
      : { data: { data: { items: [{ id: 'role-sales-1', name: 'Rep One', code: 'rep-1' }], count: 1 } }, isLoading: false, isError: false },
  ),
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

// leadDraft.store.ts caches one store instance per userId — giving every
// test its own userId keeps each test's draft entry fully independent.
let draftTestUserCounter = 0
function nextDraftTestUserId() {
  draftTestUserCounter += 1
  return `lead-draft-test-user-${draftTestUserCounter}`
}

function draftStorageKey(userId: string) {
  return `qms:draft:new-lead:v1:${userId}`
}

function seedDraft(userId: string, draft: Record<string, unknown>) {
  sessionStorage.setItem(draftStorageKey(userId), JSON.stringify({ state: { draft, savedAt: Date.now() }, version: 1 }))
}

async function renderWizard(userId: string, props: { prefill?: Record<string, unknown> } = {}) {
  useAuthStore.getState().setAuth({ id: userId, email: 'system@gmail.com', firstName: 'System', lastName: 'User' })
  const onClose = vi.fn()
  const onCreated = vi.fn()
  const utils = render(
    <QueryClientProvider client={makeQueryClient()}>
      <NewLeadWizard onClose={onClose} onCreated={onCreated} prefill={props.prefill} />
    </QueryClientProvider>,
  )
  return { onClose, onCreated, unmount: utils.unmount }
}

describe('NewLeadWizard — draft persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    useAuthStore.getState().clearAuth()
  })

  it('shows no resume decision view and the real Step 1 content when no draft exists', async () => {
    const userId = nextDraftTestUserId()
    await renderWizard(userId)

    expect(await screen.findByText(/pharma company/i)).toBeInTheDocument()
    expect(screen.queryByText(/unsaved lead from earlier/i)).not.toBeInTheDocument()
  })

  it('shows the resume decision view (not the editable form) when a draft exists, and does not overwrite it while undecided', async () => {
    const userId = nextDraftTestUserId()
    seedDraft(userId, { tenantId: 'tenant-1', tenantLabel: 'Sun Cardio' })
    await renderWizard(userId)

    expect(await screen.findByText(/unsaved lead from earlier/i)).toBeInTheDocument()
    expect(screen.queryByText(/pharma company/i)).not.toBeInTheDocument()

    const raw = sessionStorage.getItem(draftStorageKey(userId))
    expect(JSON.parse(raw as string).state.draft).toEqual({ tenantId: 'tenant-1', tenantLabel: 'Sun Cardio' })
  })

  it('Resume restores the exact saved values into the live form', async () => {
    const userId = nextDraftTestUserId()
    seedDraft(userId, { tenantId: 'tenant-1', tenantLabel: 'Sun Cardio' })
    await renderWizard(userId)

    await userEvent.setup().click(await screen.findByRole('button', { name: /^Resume$/i }))

    expect(await screen.findByText('Sun Cardio')).toBeInTheDocument()
  })

  it('Discard clears the draft and starts fresh — reopening shows no decision view', async () => {
    const userId = nextDraftTestUserId()
    seedDraft(userId, { tenantId: 'tenant-1', tenantLabel: 'Sun Cardio' })
    const { unmount } = await renderWizard(userId)

    await userEvent.setup().click(await screen.findByRole('button', { name: /^Discard$/i }))
    await screen.findByText(/pharma company/i)
    expect(sessionStorage.getItem(draftStorageKey(userId))).toBeNull()

    unmount()
    await renderWizard(userId)
    expect(await screen.findByText(/pharma company/i)).toBeInTheDocument()
    expect(screen.queryByText(/unsaved lead from earlier/i)).not.toBeInTheDocument()
  })

  it('a prefill-carrying open never shows a decision view, reads, or clears an existing draft', async () => {
    const userId = nextDraftTestUserId()
    seedDraft(userId, { tenantId: 'tenant-1', tenantLabel: 'Untouched Normal Draft' })

    await renderWizard(userId, { prefill: { tenantId: 'tenant-9', tenantLabel: 'Appointment Tenant' } })

    expect(await screen.findByText(/pharma company/i)).toBeInTheDocument()
    expect(screen.queryByText(/unsaved lead from earlier/i)).not.toBeInTheDocument()

    const raw = sessionStorage.getItem(draftStorageKey(userId))
    expect(JSON.parse(raw as string).state.draft).toEqual({ tenantId: 'tenant-1', tenantLabel: 'Untouched Normal Draft' })
  })

  it('a real interaction, closing, and reopening offers Resume with the exact value — end-to-end debounce→persist→rehydrate', async () => {
    const userId = nextDraftTestUserId()
    const user = userEvent.setup()
    const { unmount } = await renderWizard(userId)
    await screen.findByText(/pharma company/i)

    // Division/Contact stay disabled without an async tenant pick this test
    // doesn't mock — ChipPicker's searchable popover is the simplest real field.
    await user.click(screen.getByText('Add a therapy area...'))
    await user.click(await screen.findByRole('button', { name: 'Cardiology' }))

    await waitFor(
      () => {
        const raw = sessionStorage.getItem(draftStorageKey(userId))
        expect(raw).not.toBeNull()
        expect(JSON.parse(raw as string).state.draft.focusTherapy).toEqual(['Cardiology'])
      },
      { timeout: 2000 },
    )

    unmount()

    await renderWizard(userId)
    expect(await screen.findByText(/unsaved lead from earlier/i)).toBeInTheDocument()

    await userEvent.setup().click(screen.getByRole('button', { name: /^Resume$/i }))
    expect(await screen.findByText('Cardiology')).toBeInTheDocument()
  }, 10000)

  it('a successful create calls stop() then removes the draft from sessionStorage entirely', async () => {
    const userId = nextDraftTestUserId()
    const user = userEvent.setup()
    const onCreated = vi.fn()

    // WizardStep1's pickers all need async data this file doesn't mock, so
    // Step 1 is seeded via draft/Resume instead, letting Steps 2-4 run for real.
    seedDraft(userId, {
      tenantId: 'tenant-1', tenantLabel: 'Sun Cardio (SC)', divisionId: 'div-1', divisionLabel: 'Cardiology',
      contactPersonId: 'contact-1', contactPersonLabel: 'Dr. Contact', focusTherapy: ['Cardiology'], focusTherapyDoctor: ['Cardiologist'],
    })
    useAuthStore.getState().setAuth({ id: userId, email: 'system@gmail.com', firstName: 'System', lastName: 'User' })
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <NewLeadWizard onClose={vi.fn()} onCreated={onCreated} />
      </QueryClientProvider>,
    )
    await user.click(await screen.findByRole('button', { name: /^Resume$/i }))
    await user.click(screen.getByRole('button', { name: /^Next/i }))

    await user.type(screen.getByPlaceholderText(/cardiology screening expansion/i), 'Test Lead Title')
    await user.type(screen.getByPlaceholderText(/describe the client/i), 'A real problem statement.')
    await user.click(screen.getByRole('button', { name: 'Doctor meets' }))
    await waitFor(() => expect(sessionStorage.getItem(draftStorageKey(userId))).not.toBeNull(), { timeout: 2000 })

    await user.click(screen.getByRole('button', { name: /^Next/i }))
    await user.click(await screen.findByRole('button', { name: 'Screening' }))
    await user.click(screen.getByRole('button', { name: 'Screening Camp' }))
    await user.type(screen.getByPlaceholderText(/reason for this offering/i), 'A real reason.')
    await user.click(screen.getByRole('button', { name: /^Next/i }))

    await user.click(await screen.findByRole('combobox'))
    await user.click(await screen.findByRole('option'))

    await user.click(screen.getByRole('button', { name: /Create lead/i }))

    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    expect(sessionStorage.getItem(draftStorageKey(userId))).toBeNull()
  }, 10000)

  // Regression: salesPersonId must stay optional — the backend defaults an omitted one to the tenant's assigned rep.
  it('creating a lead without picking a sales rep still succeeds, and the payload omits salesPerson entirely', async () => {
    const { crmService } = await import('@/features/crm/crm.service')
    const userId = nextDraftTestUserId()
    const user = userEvent.setup()
    const onCreated = vi.fn()

    seedDraft(userId, {
      tenantId: 'tenant-1', tenantLabel: 'Sun Cardio (SC)', divisionId: 'div-1', divisionLabel: 'Cardiology',
      contactPersonId: 'contact-1', contactPersonLabel: 'Dr. Contact', focusTherapy: ['Cardiology'], focusTherapyDoctor: ['Cardiologist'],
    })
    useAuthStore.getState().setAuth({ id: userId, email: 'system@gmail.com', firstName: 'System', lastName: 'User' })
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <NewLeadWizard onClose={vi.fn()} onCreated={onCreated} />
      </QueryClientProvider>,
    )
    await user.click(await screen.findByRole('button', { name: /^Resume$/i }))
    await user.click(screen.getByRole('button', { name: /^Next/i }))

    await user.type(screen.getByPlaceholderText(/cardiology screening expansion/i), 'Test Lead Title')
    await user.type(screen.getByPlaceholderText(/describe the client/i), 'A real problem statement.')
    await user.click(screen.getByRole('button', { name: 'Doctor meets' }))

    await user.click(screen.getByRole('button', { name: /^Next/i }))
    await user.click(await screen.findByRole('button', { name: 'Screening' }))
    await user.click(screen.getByRole('button', { name: 'Screening Camp' }))
    await user.type(screen.getByPlaceholderText(/reason for this offering/i), 'A real reason.')
    await user.click(screen.getByRole('button', { name: /^Next/i }))

    // Step 4 reached, sales rep combobox left untouched (no pick).
    await screen.findByRole('combobox')
    await user.click(screen.getByRole('button', { name: /Create lead/i }))

    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    const payload = vi.mocked(crmService.createLead).mock.calls[0][0]
    expect(payload).not.toHaveProperty('salesPerson')
  }, 10000)
})

// GET /role-types (needed for the picker) is admin-only and 403s for a sales-rep — skip it entirely.
describe('NewLeadWizard — sales-rep viewer is locked to themselves on Step 4', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    useAuthStore.getState().clearAuth()
  })

  async function reachStep4AsSalesRep(userId: string) {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const salesRepSessionResponse: ApiResponse<SessionResponse> = {
      success: true,
      message: '',
      data: {
        user: { id: userId, email: 'rohit@example.com', firstName: 'Rohit', lastName: 'Malhotra' },
        role: { id: 'role-rohit', code: 'sr-rohit', name: 'Rohit Malhotra' },
        roleType: { id: 'rt-sales-rep', code: 'sales-rep', name: 'Sales Rep' },
        tenant: { id: 'tenant-1', code: 'qms', name: 'QMS', type: 'platform' },
        permissions: ['lead:create'],
      },
    }
    vi.mocked(accessManagementService.getMe).mockResolvedValue(salesRepSessionResponse)

    const user = userEvent.setup()
    seedDraft(userId, {
      tenantId: 'tenant-1', tenantLabel: 'Sun Cardio (SC)', divisionId: 'div-1', divisionLabel: 'Cardiology',
      contactPersonId: 'contact-1', contactPersonLabel: 'Dr. Contact', focusTherapy: ['Cardiology'], focusTherapyDoctor: ['Cardiologist'],
    })
    useAuthStore.getState().setAuth({ id: userId, email: 'rohit@example.com', firstName: 'Rohit', lastName: 'Malhotra' })
    const onCreated = vi.fn()
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <NewLeadWizard onClose={vi.fn()} onCreated={onCreated} />
      </QueryClientProvider>,
    )
    await user.click(await screen.findByRole('button', { name: /^Resume$/i }))
    await user.click(screen.getByRole('button', { name: /^Next/i }))

    await user.type(screen.getByPlaceholderText(/cardiology screening expansion/i), 'Test Lead Title')
    await user.type(screen.getByPlaceholderText(/describe the client/i), 'A real problem statement.')
    await user.click(screen.getByRole('button', { name: 'Doctor meets' }))

    await user.click(screen.getByRole('button', { name: /^Next/i }))
    await user.click(await screen.findByRole('button', { name: 'Screening' }))
    await user.click(screen.getByRole('button', { name: 'Screening Camp' }))
    await user.type(screen.getByPlaceholderText(/reason for this offering/i), 'A real reason.')
    await user.click(screen.getByRole('button', { name: /^Next/i }))

    return { user, onCreated }
  }

  it('shows the sales rep locked to "self" (no picker, no GET /role-types lookup) on Step 4', async () => {
    const userId = nextDraftTestUserId()
    await reachStep4AsSalesRep(userId)

    expect(await screen.findByText('Rohit Malhotra')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    const { useRoleTypes } = await import('@/features/access-management/role-type/hooks/useRoleTypes')
    expect(vi.mocked(useRoleTypes).mock.calls.every((call) => call[1] === false)).toBe(true)
  })

  it('submits the lead with salesPerson set to the viewer\'s own role id, not any prefill', async () => {
    const { crmService } = await import('@/features/crm/crm.service')
    const userId = nextDraftTestUserId()
    const { user, onCreated } = await reachStep4AsSalesRep(userId)

    await user.click(screen.getByRole('button', { name: /Create lead/i }))

    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    const payload = vi.mocked(crmService.createLead).mock.calls[0][0]
    expect(payload).toHaveProperty('salesPerson', 'role-rohit')
  }, 10000)

  it('a non-sales-rep viewer (e.g. system/admin) still sees the normal picker', async () => {
    // vi.clearAllMocks() resets call history, not a prior mockResolvedValue override — restore the
    // module-level default explicitly rather than depend on test execution order.
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.getMe).mockResolvedValue(sessionResponse)

    const userId = nextDraftTestUserId()
    seedDraft(userId, {
      tenantId: 'tenant-1', tenantLabel: 'Sun Cardio (SC)', divisionId: 'div-1', divisionLabel: 'Cardiology',
      contactPersonId: 'contact-1', contactPersonLabel: 'Dr. Contact', focusTherapy: ['Cardiology'], focusTherapyDoctor: ['Cardiologist'],
    })
    useAuthStore.getState().setAuth({ id: userId, email: 'system@gmail.com', firstName: 'System', lastName: 'User' })
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <NewLeadWizard onClose={vi.fn()} onCreated={vi.fn()} />
      </QueryClientProvider>,
    )
    await user.click(await screen.findByRole('button', { name: /^Resume$/i }))
    await user.click(screen.getByRole('button', { name: /^Next/i }))
    await user.type(screen.getByPlaceholderText(/cardiology screening expansion/i), 'Test Lead Title')
    await user.type(screen.getByPlaceholderText(/describe the client/i), 'A real problem statement.')
    await user.click(screen.getByRole('button', { name: 'Doctor meets' }))
    await user.click(screen.getByRole('button', { name: /^Next/i }))
    await user.click(await screen.findByRole('button', { name: 'Screening' }))
    await user.click(screen.getByRole('button', { name: 'Screening Camp' }))
    await user.type(screen.getByPlaceholderText(/reason for this offering/i), 'A real reason.')
    await user.click(screen.getByRole('button', { name: /^Next/i }))

    expect(await screen.findByRole('combobox')).toBeInTheDocument()
  }, 10000)
})
