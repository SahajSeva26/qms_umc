import { useState } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ProjectEntity } from '@/types/project.types'

vi.mock('@/hooks/useSession')

vi.mock('@/features/pharma/pharmaProjects.service', () => ({
  pharmaProjectsService: {
    searchScopedProjects: vi.fn(),
    getProject: vi.fn(),
    getProjectRequirements: vi.fn(),
  },
}))

// The devices card has its own dedicated test file — stub it here so this tab's own tests don't
// need to also mock GET /projects/:id/requirements.
vi.mock('@/features/pharma/components/ProjectDevicesRequiredCard', () => ({ default: () => null }))

// Stub is stateful so a remount regression test can prove `key={projectId}` actually loses state.
vi.mock('@/features/pharma/components/BookCampForm', () => ({
  default: function MockBookCampForm({ needsMrPicker, type, project, patientExpectation, patientExpectationInvalid }: {
    needsMrPicker: boolean; type: string | null; project: { name: string } | null
    patientExpectation: number | undefined; patientExpectationInvalid?: boolean
  }) {
    const [doctorDraft, setDoctorDraft] = useState('')
    return (
      <div>
        <div>Booking form mounted · type: {type ?? 'none'} · project: {project?.name ?? 'none'}</div>
        <div>patientExpectation: {patientExpectation ?? 'undefined'} · invalid: {String(!!patientExpectationInvalid)}</div>
        <div>needsMrPicker: {String(needsMrPicker)}</div>
        <input placeholder="Doctor draft (simulated field state)" value={doctorDraft} onChange={(e) => setDoctorDraft(e.target.value)} />
      </div>
    )
  },
}))

function projectFixture(overrides: Partial<ProjectEntity> = {}): ProjectEntity {
  return {
    id: 'proj-1', name: 'Cardio Screening Drive', code: 'PRJ-1', status: 'live',
    type: ['screening'], whoCanBookCamp: ['pharma-mr'], campTimeSlots: ['9am-1pm', '10am-2pm'],
    daysToBookBefore: 0, tests: [],
    ...overrides,
  } as ProjectEntity
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function mockSession(roleTypeCode = 'pharma-mr') {
  const { useSession } = await import('@/hooks/useSession')
  vi.mocked(useSession).mockReturnValue({
    session: { role: { id: 'self-role-1', division: 'div-1' }, roleType: { code: roleTypeCode } },
  } as unknown as ReturnType<typeof useSession>)
}

async function renderTab(props: { needsMrPicker?: boolean; roleTypeCode?: string } = {}) {
  await mockSession(props.roleTypeCode)
  const MrBookCampTab = (await import('./MrBookCampTab')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MrBookCampTab needsMrPicker={props.needsMrPicker} />
    </QueryClientProvider>,
  )
}

async function pickProject(user: ReturnType<typeof userEvent.setup>, project: ProjectEntity = projectFixture()) {
  const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
  vi.mocked(pharmaProjectsService.searchScopedProjects).mockResolvedValue({
    success: true, message: '', data: { items: [project], count: 1 },
  })
  await user.type(screen.getByPlaceholderText(/search or browse projects/i), 'Cardio')
  const option = await screen.findByText(new RegExp(project.name, 'i'), {}, { timeout: 3000 })
  await user.click(option)
}

describe('MrBookCampTab — BookCampForm stays persistently mounted', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('BookCampForm is mounted from the very first render, before any project is picked', async () => {
    await renderTab()

    expect(screen.getByText(/booking form mounted · type: none · project: none/i)).toBeInTheDocument()
  })

  it('the camp-type picker is disabled until a project is picked', async () => {
    await renderTab()

    expect(screen.getByText(/pick a project first/i)).toBeInTheDocument()
  })
})

describe('MrBookCampTab — real searchable project picker', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('typing a query shows real search results, and picking a multi-type project keeps BookCampForm mounted with no type yet', async () => {
    const user = userEvent.setup()
    await renderTab()

    // A single-type project now auto-selects its one allowed camp type on pick — multi-type
    // genuinely leaves no type picked yet, which is what this test is actually about.
    await pickProject(user, projectFixture({ type: ['screening', 'diet'] }))

    expect(await screen.findByText(/cardio screening drive \(prj-1\)/i)).toBeInTheDocument()
    expect(screen.getByText(/booking form mounted · type: none · project: none/i)).toBeInTheDocument()
  })

  it('clearing the selection and picking a DIFFERENT project remounts BookCampForm (key=projectId), losing any in-progress field state from the first project', async () => {
    const user = userEvent.setup()
    await renderTab()

    await pickProject(user, projectFixture({ id: 'proj-a', name: 'Project A', code: 'PRJ-A' }))
    expect(await screen.findByText(/booking form mounted · type: screening · project: project a/i)).toBeInTheDocument()

    // A stateless mock would pass this test even if the real remount broke.
    const doctorDraftInput = screen.getByPlaceholderText(/doctor draft/i)
    await user.type(doctorDraftInput, 'Dr. Stale From Project A')
    expect(doctorDraftInput).toHaveValue('Dr. Stale From Project A')

    await user.click(screen.getByRole('button', { name: /clear selected project/i }))
    // Multi-type so the repick genuinely leaves no type auto-selected — same reasoning as the
    // single-vs-multi-type project fixture above.
    await pickProject(user, projectFixture({ id: 'proj-b', name: 'Project B', code: 'PRJ-B', type: ['screening', 'diet'] }))

    expect(await screen.findByText(/booking form mounted · type: none · project: none/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/doctor draft/i)).toHaveValue('')
  })

  it('the typeahead requests the shared page size of 10, not an unbounded/oversized limit', async () => {
    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    vi.mocked(pharmaProjectsService.searchScopedProjects).mockResolvedValue({
      success: true, message: '', data: { items: [projectFixture()], count: 1 },
    })
    const user = userEvent.setup()
    await renderTab()

    await user.type(screen.getByPlaceholderText(/search or browse projects/i), 'Cardio')

    await waitFor(() => expect(pharmaProjectsService.searchScopedProjects).toHaveBeenCalled())
    const lastCall = vi.mocked(pharmaProjectsService.searchScopedProjects).mock.calls.at(-1)?.[0]
    expect(lastCall?.limit).toBe('10')
  })

  it('opening the picker with no query typed browses the MR\'s own live projects immediately', async () => {
    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    vi.mocked(pharmaProjectsService.searchScopedProjects).mockResolvedValue({
      success: true, message: '', data: { items: [projectFixture()], count: 1 },
    })
    const user = userEvent.setup()
    await renderTab()

    await user.click(screen.getByPlaceholderText(/search or browse projects/i))

    expect(await screen.findByText(/cardio screening drive \(prj-1\)/i)).toBeInTheDocument()
    expect(pharmaProjectsService.searchScopedProjects).toHaveBeenCalledWith(expect.objectContaining({ name: undefined, status: 'live' }))
  })
})

describe('MrBookCampTab — project/camp-type gating passed into BookCampForm', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('picking a project then its camp type mounts BookCampForm with real project/type context', async () => {
    const user = userEvent.setup()
    await renderTab()

    await pickProject(user)

    expect(await screen.findByText(/booking form mounted · type: screening · project: cardio screening drive/i)).toBeInTheDocument()
  })

  it('a project with no configured time slots blocks booking with a clear message, and BookCampForm never receives it', async () => {
    const user = userEvent.setup()
    await renderTab()

    await pickProject(user, projectFixture({ campTimeSlots: [] }))

    expect(await screen.findByText(/this project has no configured time slots/i)).toBeInTheDocument()
    expect(screen.getByText(/booking form mounted · type: none · project: none/i)).toBeInTheDocument()
  })

  it('a project whose whoCanBookCamp excludes pharma-mr blocks booking with a clear message, and BookCampForm never receives it — the backend 409s this too, but the UI should surface it before the MR fills the whole form', async () => {
    const user = userEvent.setup()
    await renderTab()

    await pickProject(user, projectFixture({ whoCanBookCamp: ['pharma-asm', 'pharma-rsm'] }))

    expect(await screen.findByText(/your role cannot book camps on this project/i)).toBeInTheDocument()
    expect(screen.getByText(/booking form mounted · type: none · project: none/i)).toBeInTheDocument()
  })

  it('an empty whoCanBookCamp array means any role may book — no restriction configured', async () => {
    const user = userEvent.setup()
    await renderTab()

    await pickProject(user, projectFixture({ whoCanBookCamp: [] }))

    expect(screen.queryByText(/your role cannot book camps on this project/i)).not.toBeInTheDocument()
    expect(await screen.findByText(/booking form mounted · type: screening · project: cardio screening drive/i)).toBeInTheDocument()
  })

  it('a multi-type project leaves the camp-type Select for the MR to choose explicitly', async () => {
    const user = userEvent.setup()
    await renderTab()

    await pickProject(user, projectFixture({ type: ['screening', 'diet'] }))
    expect(await screen.findByText(/booking form mounted · type: none · project: none/i)).toBeInTheDocument()

    await user.click(await screen.findByRole('combobox', { name: '' }))
    await user.click(await screen.findByRole('option', { name: 'Diet' }))

    expect(await screen.findByText(/booking form mounted · type: diet · project: cardio screening drive/i)).toBeInTheDocument()
  })
})

describe('MrBookCampTab — Expected patients (section 1, owned outside BookCampForm)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('a valid non-negative integer passes through to BookCampForm untouched', async () => {
    const user = userEvent.setup()
    await renderTab()

    await pickProject(user)
    await user.type(screen.getByLabelText(/expected patients/i), '25')

    expect(await screen.findByText(/patientExpectation: 25 · invalid: false/i)).toBeInTheDocument()
  })

  it('a negative value shows a visible error and marks patientExpectationInvalid — the field has no validation of its own inside BookCampForm', async () => {
    const user = userEvent.setup()
    await renderTab()

    await pickProject(user)
    await user.type(screen.getByLabelText(/expected patients/i), '-5')

    expect(await screen.findByText(/must be 0 or more/i)).toBeInTheDocument()
    expect(screen.getByText(/invalid: true/i)).toBeInTheDocument()
  })

  it('a decimal value shows a visible error and marks patientExpectationInvalid', async () => {
    const user = userEvent.setup()
    await renderTab()

    await pickProject(user)
    await user.type(screen.getByLabelText(/expected patients/i), '2.5')

    expect(await screen.findByText(/must be a whole number/i)).toBeInTheDocument()
    expect(screen.getByText(/invalid: true/i)).toBeInTheDocument()
  })

  it('switching from project A to project B resets the previously-typed patient count — it must never carry into the new booking', async () => {
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

describe('MrBookCampTab — needsMrPicker (HO/RSM/ASM "book on behalf of MR" reuse)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('defaults to needsMrPicker=false and the MR\'s own self-booking copy when the prop is omitted', async () => {
    await renderTab()

    expect(screen.getByText(/^book a new camp$/i)).toBeInTheDocument()
    expect(screen.getByText(/booking form mounted/i).parentElement).toBeInTheDocument()
    expect(await screen.findByText(/needsMrPicker: false/i)).toBeInTheDocument()
  })

  it('needsMrPicker=true shows the on-behalf-of heading and passes needsMrPicker through to BookCampForm unchanged', async () => {
    await renderTab({ needsMrPicker: true })

    expect(screen.getByText(/book on behalf of an mr/i)).toBeInTheDocument()
    expect(screen.queryByText(/^book a new camp$/i)).not.toBeInTheDocument()
    expect(await screen.findByText(/needsMrPicker: true/i)).toBeInTheDocument()
  })

  it('whoCanBookCamp is still checked against the SIGNED-IN booker\'s own role, not overridden for on-behalf-of booking', async () => {
    const user = userEvent.setup()
    // An ASM booking on behalf of an MR — the project restricts booking to pharma-mr only, so the
    // ASM (the actual booker) must still be blocked, even though needsMrPicker is true.
    await renderTab({ needsMrPicker: true, roleTypeCode: 'pharma-asm' })

    await pickProject(user, projectFixture({ whoCanBookCamp: ['pharma-mr'] }))

    expect(await screen.findByText(/your role cannot book camps on this project/i)).toBeInTheDocument()
    expect(screen.getByText(/booking form mounted · type: none · project: none/i)).toBeInTheDocument()
  })

  it('a project whose whoCanBookCamp includes the booking ASM\'s own role still books normally with needsMrPicker=true', async () => {
    const user = userEvent.setup()
    await renderTab({ needsMrPicker: true, roleTypeCode: 'pharma-asm' })

    await pickProject(user, projectFixture({ whoCanBookCamp: ['pharma-asm'] }))

    expect(screen.queryByText(/your role cannot book camps on this project/i)).not.toBeInTheDocument()
    expect(await screen.findByText(/booking form mounted · type: screening · project: cardio screening drive/i)).toBeInTheDocument()
    expect(screen.getByText(/needsMrPicker: true/i)).toBeInTheDocument()
  })
})
