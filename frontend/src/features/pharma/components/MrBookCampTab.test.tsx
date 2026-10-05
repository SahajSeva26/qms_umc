import { useState } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SessionResponse } from '@/types/accessManagement.types'
import type { ProjectEntity } from '@/types/project.types'

vi.mock('@/hooks/useSession')
vi.mock('@/hooks/usePermission')

vi.mock('@/features/pharma/pharmaProjects.service', () => ({
  pharmaProjectsService: {
    searchScopedProjects: vi.fn(),
  },
}))

// Stub is stateful so a remount regression test can prove `key={projectId}` actually loses state.
vi.mock('@/features/pharma/components/BookCampForm', () => ({
  default: function MockBookCampForm({ type, project, needsMrPicker, patientExpectation, patientExpectationInvalid }: {
    type: string | null; project: { name: string } | null; needsMrPicker: boolean
    patientExpectation: number | undefined; patientExpectationInvalid?: boolean
  }) {
    const [doctorDraft, setDoctorDraft] = useState('')
    return (
      <div>
        <div>Booking form mounted · type: {type ?? 'none'} · project: {project?.name ?? 'none'} · {needsMrPicker ? 'with MR picker' : 'self-booking'}</div>
        <div>patientExpectation: {patientExpectation ?? 'undefined'} · invalid: {String(!!patientExpectationInvalid)}</div>
        <input placeholder="Doctor draft (simulated field state)" value={doctorDraft} onChange={(e) => setDoctorDraft(e.target.value)} />
      </div>
    )
  },
}))

function projectFixture(overrides: Partial<ProjectEntity> = {}): ProjectEntity {
  return {
    id: 'proj-1', code: 'PRJ-1', name: 'Cardio Screening Drive', tenant: 't-1', division: 'div-1',
    therapy: 'cardiology', type: ['screening'], tests: [], lead: null, executionMode: null, campCost: 0, totalCamps: 0,
    gst: 0, valueBeforeGST: 0, additionalCost: 0, campTimeSlots: ['9am-1pm', '10am-2pm'], freeCancelHours: 0,
    cancellationAllowed: 0, campCostDeductionOnChargableCancel: 0, goLiveScope: null,
    whoCanBookCamp: [], salesRep: null, projectCoordinator: null, status: 'live',
    createdAt: '', updatedAt: '', ...overrides,
  } as unknown as ProjectEntity
}

function sessionFixture(roleTypeCode = 'pharma-mr'): SessionResponse {
  return {
    user: { id: 'u-1', email: 'a@example.com', firstName: 'a', lastName: 'b' },
    role: { id: 'self-role-1', code: roleTypeCode, name: 'MR', division: 'div-1' },
    roleType: { id: 'rt-1', code: roleTypeCode, name: roleTypeCode },
    tenant: { id: 't-1', code: 'tenant-1', name: 'Tenant', type: 'customer' },
    permissions: ['camp:book'],
  } as unknown as SessionResponse
}

async function mockSession(roleTypeCode = 'pharma-mr') {
  const { useSession } = await import('@/hooks/useSession')
  vi.mocked(useSession).mockReturnValue({ session: sessionFixture(roleTypeCode) } as unknown as ReturnType<typeof useSession>)
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderTab() {
  const MrBookCampTab = (await import('./MrBookCampTab')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MrBookCampTab />
    </QueryClientProvider>,
  )
}

async function pickProject(user: ReturnType<typeof userEvent.setup>, project: ProjectEntity = projectFixture()) {
  const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
  vi.mocked(pharmaProjectsService.searchScopedProjects).mockResolvedValue({
    success: true, message: '', data: { items: [project], count: 1 },
  })
  await user.type(screen.getByPlaceholderText(/search projects by name/i), 'Cardio')
  const option = await screen.findByText(new RegExp(project.name, 'i'), {}, { timeout: 3000 })
  await user.click(option)
}

describe('MrBookCampTab — BookCampForm stays persistently mounted', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('BookCampForm is mounted from the very first render, before any project is picked', async () => {
    await mockSession()
    await renderTab()

    expect(screen.getByText(/booking form mounted · type: none · project: none/i)).toBeInTheDocument()
  })

  it('the camp-type picker is disabled until a project is picked', async () => {
    await mockSession()
    await renderTab()

    expect(screen.getByText(/pick a project first/i)).toBeInTheDocument()
  })
})

describe('MrBookCampTab — real searchable project picker', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('typing a query shows real search results, and picking one keeps BookCampForm mounted with no type yet', async () => {
    await mockSession()
    const user = userEvent.setup()
    await renderTab()

    await pickProject(user)

    expect(await screen.findByText(/cardio screening drive \(prj-1\)/i)).toBeInTheDocument()
    expect(screen.getByText(/booking form mounted · type: none · project: none/i)).toBeInTheDocument()
  })

  it('picking a result closes the dropdown, which disables its own query (AsyncPicker only fetches while open) — no background refetch can reach it while a project is selected', async () => {
    await mockSession()
    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    const user = userEvent.setup()
    await renderTab()

    await pickProject(user)
    expect(await screen.findByText(/cardio screening drive \(prj-1\)/i)).toBeInTheDocument()
    vi.mocked(pharmaProjectsService.searchScopedProjects).mockClear()

    // AsyncPicker only fetches while open, so no background refetch should fire post-pick.
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(pharmaProjectsService.searchScopedProjects).not.toHaveBeenCalled()
    expect(screen.getByText(/cardio screening drive \(prj-1\)/i)).toBeInTheDocument()
  })

  it('the old bug this guards against: clearing and re-searching to a result set that does NOT include the previous pick leaves the field genuinely empty, not silently reselecting stale state', async () => {
    await mockSession()
    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    const user = userEvent.setup()
    await renderTab()

    await pickProject(user, projectFixture({ id: 'proj-old', name: 'Old Project', code: 'PRJ-OLD' }))
    expect(await screen.findByText(/old project \(prj-old\)/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /clear selected project/i }))
    vi.mocked(pharmaProjectsService.searchScopedProjects).mockResolvedValue({
      success: true, message: '', data: { items: [], count: 0 },
    })
    await user.type(screen.getByPlaceholderText(/search projects by name/i), 'zzz-no-match')

    await waitFor(() => expect(pharmaProjectsService.searchScopedProjects).toHaveBeenCalled())
    expect(screen.queryByText(/old project \(prj-old\)/i)).not.toBeInTheDocument()
    expect(screen.getByText(/no matching projects found/i)).toBeInTheDocument()
  })

  it('clearing the selection and picking a DIFFERENT project remounts BookCampForm (key=projectId), losing any in-progress field state from the first project', async () => {
    await mockSession()
    const user = userEvent.setup()
    await renderTab()

    await pickProject(user, projectFixture({ id: 'proj-a', name: 'Project A', code: 'PRJ-A' }))
    await user.click(await screen.findByRole('combobox', { name: '' }))
    await user.click(await screen.findByRole('option', { name: 'Screening' }))
    expect(await screen.findByText(/booking form mounted · type: screening · project: project a/i)).toBeInTheDocument()

    // A stateless mock would pass this test even if the real remount broke.
    const doctorDraftInput = screen.getByPlaceholderText(/doctor draft/i)
    await user.type(doctorDraftInput, 'Dr. Stale From Project A')
    expect(doctorDraftInput).toHaveValue('Dr. Stale From Project A')

    await user.click(screen.getByRole('button', { name: /clear selected project/i }))
    await pickProject(user, projectFixture({ id: 'proj-b', name: 'Project B', code: 'PRJ-B' }))

    expect(await screen.findByText(/booking form mounted · type: none · project: none/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/doctor draft/i)).toHaveValue('')
  })

  it('the typeahead requests the shared page size of 10, not an unbounded/oversized limit', async () => {
    await mockSession()
    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    vi.mocked(pharmaProjectsService.searchScopedProjects).mockResolvedValue({
      success: true, message: '', data: { items: [projectFixture()], count: 1 },
    })
    const user = userEvent.setup()
    await renderTab()

    await user.type(screen.getByPlaceholderText(/search projects by name/i), 'Cardio')

    await waitFor(() => expect(pharmaProjectsService.searchScopedProjects).toHaveBeenCalled())
    const lastCall = vi.mocked(pharmaProjectsService.searchScopedProjects).mock.calls.at(-1)?.[0]
    expect(lastCall?.limit).toBe('10')
  })

  it('opening the picker with no query typed fetches nothing — an unfiltered project list is never requested just because the dropdown is open', async () => {
    await mockSession()
    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    const user = userEvent.setup()
    await renderTab()

    await user.click(screen.getByPlaceholderText(/search projects by name/i))

    expect(screen.getByText(/start typing to search your division's projects/i)).toBeInTheDocument()
    expect(pharmaProjectsService.searchScopedProjects).not.toHaveBeenCalled()
  })
})

describe('MrBookCampTab — project/camp-type gating passed into BookCampForm', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('picking a project then its camp type mounts BookCampForm with real project/type context', async () => {
    await mockSession()
    const user = userEvent.setup()
    await renderTab()

    await pickProject(user)
    await user.click(await screen.findByRole('combobox', { name: '' }))
    await user.click(await screen.findByRole('option', { name: 'Screening' }))

    expect(await screen.findByText(/booking form mounted · type: screening · project: cardio screening drive/i)).toBeInTheDocument()
  })

  it('a project with no configured time slots blocks booking with a clear message, and BookCampForm never receives it', async () => {
    await mockSession()
    const user = userEvent.setup()
    await renderTab()

    await pickProject(user, projectFixture({ campTimeSlots: [] }))

    expect(await screen.findByText(/this project has no configured time slots/i)).toBeInTheDocument()
    expect(screen.getByText(/booking form mounted · type: none · project: none/i)).toBeInTheDocument()
  })

  it("a project this role can't book on blocks booking with a clear message", async () => {
    await mockSession('pharma-asm')
    const user = userEvent.setup()
    await renderTab()

    await pickProject(user, projectFixture({ whoCanBookCamp: ['pharma-mr'] }))

    expect(await screen.findByText(/your role cannot book camps on this project/i)).toBeInTheDocument()
    expect(screen.getByText(/booking form mounted · type: none · project: none/i)).toBeInTheDocument()
  })

  it('an ASM/RSM/HO session passes needsMrPicker=true through to BookCampForm; an MR session passes false', async () => {
    await mockSession('pharma-rsm')
    const user = userEvent.setup()
    await renderTab()

    await pickProject(user, projectFixture({ id: 'proj-rsm', whoCanBookCamp: [] }))
    await user.click(await screen.findByRole('combobox', { name: '' }))
    await user.click(await screen.findByRole('option', { name: 'Screening' }))

    expect(await screen.findByText(/with mr picker/i)).toBeInTheDocument()
  })
})

describe('MrBookCampTab — Expected patients (section 1, owned outside BookCampForm)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('a valid non-negative integer passes through to BookCampForm untouched', async () => {
    await mockSession()
    const user = userEvent.setup()
    await renderTab()

    await pickProject(user)
    await user.click(await screen.findByRole('combobox', { name: '' }))
    await user.click(await screen.findByRole('option', { name: 'Screening' }))
    await user.type(screen.getByLabelText(/expected patients/i), '25')

    expect(await screen.findByText(/patientExpectation: 25 · invalid: false/i)).toBeInTheDocument()
  })

  it('a negative value shows a visible error and marks patientExpectationInvalid — the field has no validation of its own inside BookCampForm', async () => {
    await mockSession()
    const user = userEvent.setup()
    await renderTab()

    await pickProject(user)
    await user.click(await screen.findByRole('combobox', { name: '' }))
    await user.click(await screen.findByRole('option', { name: 'Screening' }))
    await user.type(screen.getByLabelText(/expected patients/i), '-5')

    expect(await screen.findByText(/must be 0 or more/i)).toBeInTheDocument()
    expect(screen.getByText(/invalid: true/i)).toBeInTheDocument()
  })

  it('a decimal value shows a visible error and marks patientExpectationInvalid', async () => {
    await mockSession()
    const user = userEvent.setup()
    await renderTab()

    await pickProject(user)
    await user.click(await screen.findByRole('combobox', { name: '' }))
    await user.click(await screen.findByRole('option', { name: 'Screening' }))
    await user.type(screen.getByLabelText(/expected patients/i), '2.5')

    expect(await screen.findByText(/must be a whole number/i)).toBeInTheDocument()
    expect(screen.getByText(/invalid: true/i)).toBeInTheDocument()
  })

  it('switching from project A to project B resets the previously-typed patient count — it must never carry into the new booking', async () => {
    await mockSession()
    const user = userEvent.setup()
    await renderTab()

    await pickProject(user, projectFixture({ id: 'proj-a', name: 'Project A', code: 'PRJ-A' }))
    await user.type(screen.getByLabelText(/expected patients/i), '40')
    expect(await screen.findByText(/patientExpectation: 40/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /clear selected project/i }))
    await pickProject(user, projectFixture({ id: 'proj-b', name: 'Project B', code: 'PRJ-B' }))

    expect(screen.getByLabelText(/expected patients/i)).toHaveValue(null)
    expect(await screen.findByText(/patientExpectation: undefined/i)).toBeInTheDocument()
  })
})
