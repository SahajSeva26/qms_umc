import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAuthStore } from '@/features/auth/store'
import NewProjectWizard from './NewProjectWizard'

const emptyList = { success: true, message: '', data: { items: [], count: 0 } } as never

// The wizard's draft-persistence layer waits on useSession() (GET /auth/me)
// before deciding whether to show the real editable form.
const sessionResponse = {
  success: true,
  message: '',
  data: {
    user: { id: 'user-1', email: 'system@gmail.com', firstName: 'System', lastName: 'User' },
    role: { id: 'role-1', name: 'System' },
    roleType: { id: 'rt-1', code: 'system' },
    tenant: { id: 'tenant-1', name: 'QMS' },
    permissions: ['system:manage'],
  },
}

vi.mock('@/features/projects/projects.service', () => ({
  projectsService: {
    searchWonLeads: vi.fn(async () => ({
      success: true,
      message: '',
      // tenant/division use `_id`, matching real populated backend documents.
      data: { items: [{ id: 'lead-1', title: 'Sun Cardio Screening', tenant: { _id: 'tenant-1', name: 'Sun Cardio' }, division: { _id: 'div-1', name: 'Cardiology' } }], count: 1 },
    })),
    createProject: vi.fn(async () => ({ success: true, message: '', data: { id: 'new-project-id' } })),
    updateProject: vi.fn(async () => ({ success: true, message: '', data: { id: 'edit-project-id' } })),
  },
}))
vi.mock('@/features/test-master/test.service', () => ({
  testService: { searchTests: vi.fn(async () => emptyList) },
}))
vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    getMe: vi.fn(async () => sessionResponse),
    searchTenants: vi.fn(async () => ({ success: true, message: '', data: { items: [{ id: 'platform-1', name: 'QMS', code: 'qms', type: 'platform' }], count: 1 } })),
    searchRoleTypes: vi.fn(async () => ({ success: true, message: '', data: { items: [{ id: 'rt-1', code: 'sales-rep', name: 'Sales Rep' }], count: 1 } })),
    searchRoles: vi.fn(async () => ({ success: true, message: '', data: { items: [{ id: 'role-1', name: 'Rep One', code: 'rep-1' }], count: 1 } })),
  },
}))
vi.mock('@/features/contacts/hooks/useContacts', () => ({
  useContacts: vi.fn(() => ({ data: { data: { items: [{ id: 'contact-1', name: 'Marketing Contact' }], count: 1 } }, isLoading: false, isError: false })),
}))
vi.mock('@/hooks/usePermission', () => ({
  usePermission: vi.fn(() => ({ hasAnyPermission: () => true })),
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

// projectDraft.store.ts caches one Zustand store instance per userId in a
// module-level Map — a fresh userId per test keeps store/sessionStorage state isolated.
let draftTestUserCounter = 0
function nextDraftTestUserId() {
  draftTestUserCounter += 1
  return `draft-test-user-${draftTestUserCounter}`
}

function draftStorageKey(userId: string) {
  return `qms:draft:new-project:v1:${userId}`
}

function seedDraft(userId: string, draft: Record<string, unknown>) {
  sessionStorage.setItem(draftStorageKey(userId), JSON.stringify({ state: { draft, savedAt: Date.now() }, version: 1 }))
}

async function renderWizard(onClose = vi.fn(), onSaved = vi.fn()) {
  // SessionBootstrap.tsx normally populates useAuthStore; it isn't part of
  // this render tree, so it's set directly here instead.
  useAuthStore.getState().setAuth({ id: nextDraftTestUserId(), email: 'system@gmail.com', firstName: 'System', lastName: 'User' })
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <NewProjectWizard editProject={null} onClose={onClose} onSaved={onSaved} />
    </QueryClientProvider>,
  )
  await screen.findByText(/pick the source lead/i)
  return { onClose, onSaved }
}

// Several wizard inputs have no htmlFor/id label association — query by RHF's
// `name` attribute instead. Queries document.body since Dialog portals there.
function fieldByName(name: string): HTMLInputElement {
  const el = document.body.querySelector<HTMLInputElement>(`input[name="${name}"]`)
  if (!el) throw new Error(`No input[name="${name}"] found`)
  return el
}

function queryFieldByName(name: string): HTMLInputElement | null {
  return document.body.querySelector<HTMLInputElement>(`input[name="${name}"]`)
}

async function advanceThroughLeadAndBasics(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText(/search by lead title/i), 'Sun Cardio')
  await user.click(await screen.findByRole('button', { name: /Sun Cardio Screening/i }))
  await user.click(screen.getByRole('button', { name: /^Next/i }))

  await user.type(screen.getByPlaceholderText(/Sun Cardio/i), 'My Test Project')
  await user.click(screen.getByRole('combobox', { name: '' }))
  await user.click(await screen.findByRole('option', { name: /cardiology/i }))
  await user.click(screen.getByRole('button', { name: /Screening Camp/i }))
  await user.click(screen.getByRole('button', { name: /^Next/i }))
}

describe('NewProjectWizard — navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  it('blocks Next on Step 0 until a lead is picked', async () => {
    const user = userEvent.setup()
    await renderWizard()

    await user.click(screen.getByRole('button', { name: /^Next/i }))

    // Still on Step 0 — the "Pick the source lead" heading is still shown.
    expect(screen.getByText(/pick the source lead/i)).toBeInTheDocument()
  })

  it('advances to Step 1 once a lead is picked', async () => {
    const user = userEvent.setup()
    await renderWizard()

    await user.type(screen.getByPlaceholderText(/search by lead title/i), 'Sun Cardio')
    await user.click(await screen.findByRole('button', { name: /Sun Cardio Screening/i }))
    await user.click(screen.getByRole('button', { name: /^Next/i }))

    expect(await screen.findByText(/project basics/i)).toBeInTheDocument()
  })

  it('Back returns to the previous step without losing already-entered values', async () => {
    const user = userEvent.setup()
    await renderWizard()

    await advanceThroughLeadAndBasics(user)
    await waitFor(() => expect(fieldByName('poNumber')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Back/i }))
    expect(screen.getByDisplayValue('My Test Project')).toBeInTheDocument()
  })
})

describe('NewProjectWizard — execution mode switching preserves other modes\' fields', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  it('switching from PO to Agreement and back keeps the PO number intact', async () => {
    const user = userEvent.setup()
    await renderWizard()
    await advanceThroughLeadAndBasics(user)
    await waitFor(() => expect(fieldByName('poNumber')).toBeInTheDocument())

    await user.type(fieldByName('poNumber'), 'PO-999')

    await user.click(screen.getByRole('button', { name: /Agreement Based/i }))
    expect(queryFieldByName('poNumber')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /PO Based/i }))
    expect(fieldByName('poNumber')).toHaveValue('PO-999')
  })
})

describe('NewProjectWizard — numeric field NaN-safety', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  it('clearing a financial numeric field never produces NaN in the live GST preview', async () => {
    const user = userEvent.setup()
    await renderWizard()
    await advanceThroughLeadAndBasics(user)
    await waitFor(() => expect(fieldByName('poNumber')).toBeInTheDocument())
    await user.type(fieldByName('poNumber'), 'PO-1')
    await user.click(screen.getByRole('button', { name: /^Next/i })) // Step 2 -> Step 3 (Financials); PO mode already has poDate defaulted

    const campCostInput = await waitFor(() => fieldByName('campCost'))
    await user.clear(campCostInput)
    await user.type(campCostInput, '500')
    await user.clear(campCostInput)

    // computedValueBeforeGST = campCost * totalCamps must render "₹0", never "₹NaN".
    expect(screen.queryAllByText(/NaN/)).toHaveLength(0)
  })
})

describe('NewProjectWizard — step-scoped validation actually blocks Next', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  it('a negative Camp cost blocks Next on Financials and shows a visible error', async () => {
    const user = userEvent.setup()
    await renderWizard()
    await advanceThroughLeadAndBasics(user)
    await waitFor(() => expect(fieldByName('poNumber')).toBeInTheDocument())
    await user.type(fieldByName('poNumber'), 'PO-1')
    await user.click(screen.getByRole('button', { name: /^Next/i })) // Step 2 -> Step 3 (Financials)

    // Sets valueBeforeGST directly so this isolates campCost's OWN validation,
    // not a coincidental pre-existing valueBeforeGST=0 failure.
    const valueBeforeGSTInput = await waitFor(() => fieldByName('valueBeforeGST'))
    await user.clear(valueBeforeGSTInput)
    await user.type(valueBeforeGSTInput, '10000')

    const campCostInput = fieldByName('campCost')
    await user.clear(campCostInput)
    await user.type(campCostInput, '-5')
    await user.click(screen.getByRole('button', { name: /^Next/i }))

    // queryFieldByName (not fieldByName) so a wrongful advance to Operations
    // fails this assertion cleanly instead of throwing.
    expect(queryFieldByName('campCost')).toBeInTheDocument()
    expect(queryFieldByName('freeCancelHours')).not.toBeInTheDocument()
    expect(await screen.findByText(/camp cost cannot be negative/i)).toBeInTheDocument()
  })

  it('a cleared PO date blocks Next on Execution and shows a visible error', async () => {
    const user = userEvent.setup()
    await renderWizard()
    await advanceThroughLeadAndBasics(user)
    await waitFor(() => expect(fieldByName('poNumber')).toBeInTheDocument())
    await user.type(fieldByName('poNumber'), 'PO-1')
    await user.clear(fieldByName('poDate'))
    await user.click(screen.getByRole('button', { name: /^Next/i }))

    // queryFieldByName (not fieldByName) so a wrongful advance fails cleanly.
    expect(queryFieldByName('poNumber')).toBeInTheDocument()
    expect(queryFieldByName('campCost')).not.toBeInTheDocument()
    expect(await screen.findByText(/po date is required/i)).toBeInTheDocument()
  })
})

describe('NewProjectWizard — draft persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    useAuthStore.getState().clearAuth()
  })

  async function renderWizardRaw(userId: string, onClose = vi.fn(), onSaved = vi.fn()) {
    useAuthStore.getState().setAuth({ id: userId, email: 'system@gmail.com', firstName: 'System', lastName: 'User' })
    const utils = render(
      <QueryClientProvider client={makeQueryClient()}>
        <NewProjectWizard editProject={null} onClose={onClose} onSaved={onSaved} />
      </QueryClientProvider>,
    )
    return { onClose, onSaved, unmount: utils.unmount }
  }

  it('a fresh login (real POST /auth/login response shape) never leaves the wizard stuck on "Checking for a saved draft…"', async () => {
    const userId = nextDraftTestUserId()
    const realLoginResponseShape: import('@/types/auth.types').AuthUser = {
      id: userId,
      email: 'system@gmail.com',
      firstName: 'System',
      lastName: 'User',
    }
    useAuthStore.getState().setAuth(realLoginResponseShape)
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <NewProjectWizard editProject={null} onClose={vi.fn()} onSaved={vi.fn()} />
      </QueryClientProvider>,
    )

    expect(await screen.findByText(/pick the source lead/i)).toBeInTheDocument()
    expect(screen.queryByText(/checking for a saved draft/i)).not.toBeInTheDocument()
  })

  it('shows the resume decision view (not the editable form) when a draft exists, and does not overwrite it while undecided', async () => {
    const userId = nextDraftTestUserId()
    seedDraft(userId, { name: 'My Saved Draft', leadId: 'lead-1' })
    await renderWizardRaw(userId)

    expect(await screen.findByText(/unsaved project from earlier/i)).toBeInTheDocument()
    expect(screen.queryByText(/pick the source lead/i)).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/search by lead title/i)).not.toBeInTheDocument()

    const raw = sessionStorage.getItem(draftStorageKey(userId))
    expect(JSON.parse(raw as string).state.draft).toEqual({ name: 'My Saved Draft', leadId: 'lead-1' })
  })

  it('Resume restores the exact saved values into the live form, with the picked lead visible immediately — no re-search required', async () => {
    const userId = nextDraftTestUserId()
    seedDraft(userId, {
      name: 'My Saved Draft',
      leadId: 'lead-1',
      leadTitle: 'Sun Cardio Screening',
      leadTenantName: 'Sun Cardio',
      leadDivisionName: 'Cardiology',
    })
    await renderWizardRaw(userId)

    await userEvent.setup().click(await screen.findByRole('button', { name: /^Resume$/i }))

    expect(await screen.findByText('Sun Cardio Screening')).toBeInTheDocument()
    expect(screen.getByText(/Sun Cardio · Cardiology/)).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/search by lead title/i)).toBeInTheDocument()

    await userEvent.setup().click(screen.getByRole('button', { name: /^Next/i }))
    expect(await screen.findByText(/project basics/i)).toBeInTheDocument()
  })

  it('Discard clears the draft and starts fresh — reopening shows no decision view', async () => {
    const userId = nextDraftTestUserId()
    seedDraft(userId, { name: 'My Saved Draft', leadId: 'lead-1' })
    const { unmount } = await renderWizardRaw(userId)

    await userEvent.setup().click(await screen.findByRole('button', { name: /^Discard$/i }))
    await screen.findByText(/pick the source lead/i)
    expect(sessionStorage.getItem(draftStorageKey(userId))).toBeNull()

    unmount()
    await renderWizardRaw(userId)
    expect(await screen.findByText(/pick the source lead/i)).toBeInTheDocument()
    expect(screen.queryByText(/unsaved project from earlier/i)).not.toBeInTheDocument()
  })

  it('never shows a decision view, and shows the real form immediately, with ZERO edits made', async () => {
    const userId = nextDraftTestUserId()
    await renderWizardRaw(userId)
    expect(await screen.findByText(/pick the source lead/i)).toBeInTheDocument()
    expect(screen.queryByText(/unsaved project from earlier/i)).not.toBeInTheDocument()
  })

  it('edit mode never shows a decision view, reads, or clears an existing draft — even with one seeded', async () => {
    const userId = nextDraftTestUserId()
    seedDraft(userId, { name: 'Untouched Draft', leadId: 'lead-1' })
    useAuthStore.getState().setAuth({ id: userId, email: 'system@gmail.com', firstName: 'System', lastName: 'User' })

    const editProject = {
      id: 'proj-1', name: 'Existing Project', lead: 'lead-1', tenant: 'tenant-1', division: 'div-1',
      therapy: 'cardiology', type: ['screening_camp'], tests: [],
      mode: { mode: 'po', poNumber: 'PO-EXIST', poDate: '2026-01-01' },
      campCost: 1000, totalCamps: 1, valueBeforeGST: 1000, gst: 18, additionalCost: 0,
      campTimeSlots: ['9am-1pm'], freeCancelHours: 24, cancellationAllowed: 10, campCostDeductionOnChargableCancel: 50,
      goLiveScope: { code: 'pan', values: [] }, whoCanBookCamp: ['pharma-asm'],
      salesRep: 'role-1', projectCoordinator: 'role-1', marketingContact: 'contact-1', paymentTerms: 'net_30',
      daysToBookBefore: 0, dietChart: [], poRenewalReminder: 80, clientReportCandance: 'monthly',
      availablePointers: [], tats: '', sops: '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <NewProjectWizard editProject={editProject} onClose={vi.fn()} onSaved={vi.fn()} />
      </QueryClientProvider>,
    )

    expect(await screen.findByText(/project basics/i)).toBeInTheDocument()
    expect(screen.queryByText(/unsaved project from earlier/i)).not.toBeInTheDocument()

    const raw = sessionStorage.getItem(draftStorageKey(userId))
    expect(JSON.parse(raw as string).state.draft).toEqual({ name: 'Untouched Draft', leadId: 'lead-1' })
  })

  it('typing into a real field, closing, and reopening offers Resume with the exact typed value — end-to-end debounce→persist→rehydrate', async () => {
    const userId = nextDraftTestUserId()
    const user = userEvent.setup()
    const { unmount } = await renderWizardRaw(userId)
    await screen.findByText(/pick the source lead/i)

    await user.type(screen.getByPlaceholderText(/search by lead title/i), 'Sun Cardio')
    await user.click(await screen.findByRole('button', { name: /Sun Cardio Screening/i }))
    await user.click(screen.getByRole('button', { name: /^Next/i }))
    await user.type(await screen.findByPlaceholderText(/Sun Cardio/i), 'Typed Before Close')

    // Let the 400ms debounce actually elapse and write to sessionStorage.
    await waitFor(
      () => {
        const raw = sessionStorage.getItem(draftStorageKey(userId))
        expect(raw).not.toBeNull()
        expect(JSON.parse(raw as string).state.draft.name).toBe('Typed Before Close')
      },
      { timeout: 2000 },
    )

    unmount()

    await renderWizardRaw(userId)
    expect(await screen.findByText(/unsaved project from earlier/i)).toBeInTheDocument()

    // Resume always lands back on Step 0 — advance to Step 1 again to see the restored name.
    const resumeUser = userEvent.setup()
    await resumeUser.click(screen.getByRole('button', { name: /^Resume$/i }))
    await resumeUser.click(screen.getByRole('button', { name: /^Next/i }))
    expect(await screen.findByDisplayValue('Typed Before Close')).toBeInTheDocument()
  }, 10000)

  it('a successful create calls stop() then removes the draft from sessionStorage entirely', async () => {
    const userId = nextDraftTestUserId()
    const user = userEvent.setup()
    const onSaved = vi.fn()
    await renderWizardRaw(userId, vi.fn(), onSaved)
    await screen.findByText(/pick the source lead/i)

    await advanceThroughLeadAndBasics(user)
    await waitFor(() => expect(fieldByName('poNumber')).toBeInTheDocument())
    await user.type(fieldByName('poNumber'), 'PO-1')
    await user.click(screen.getByRole('button', { name: /^Next/i })) // -> Financials

    // Wait for a draft to actually persist first, so this proves removal,
    // not merely "a key that was never written is absent."
    await waitFor(() => expect(sessionStorage.getItem(draftStorageKey(userId))).not.toBeNull(), { timeout: 2000 })

    const campCostInput = await waitFor(() => fieldByName('campCost'))
    await user.clear(campCostInput)
    await user.type(campCostInput, '500')
    await user.clear(fieldByName('totalCamps'))
    await user.type(fieldByName('totalCamps'), '2')
    await user.click(screen.getByRole('button', { name: /^Next/i })) // -> Operations

    await user.click(await screen.findByRole('button', { name: '9 AM – 1 PM' }))
    // PAN-India avoids needing to also pick states/cities for goLiveScopeValues.
    await user.click(screen.getByRole('button', { name: 'PAN-India' }))
    // PickCard's icon-tile "initials" span has no separating whitespace from
    // the label text node, so the accessible name concatenates them: "PH" + "pharma-division-head".
    await user.click(screen.getByRole('button', { name: 'PHpharma-division-head' }))
    await user.click(screen.getByRole('button', { name: /^Next/i })) // -> Team & Pay

    // Re-queries fresh each iteration since picking an option can
    // re-render/replace earlier trigger elements.
    await waitFor(() => expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(3))
    const comboCount = screen.getAllByRole('combobox').length
    for (let i = 0; i < comboCount; i++) {
      await user.click(screen.getAllByRole('combobox')[i])
      const options = await screen.findAllByRole('option')
      await user.click(options[0])
    }
    await user.click(screen.getByRole('button', { name: /^Next/i })) // -> Reports & Review

    await user.click(await screen.findByRole('button', { name: /Create project/i }))

    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(sessionStorage.getItem(draftStorageKey(userId))).toBeNull()
  }, 15000)
})
