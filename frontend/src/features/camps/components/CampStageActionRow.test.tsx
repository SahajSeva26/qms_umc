import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useMoveCampStage } from '@/features/camps/hooks/useMoveCampStage'
import { useActivateCamp } from '@/features/camps/hooks/useActivateCamp'
import CampStageActionRow from './CampStageActionRow'
import type { CampEntity } from '@/types/campReal.types'

vi.mock('@/features/camps/hooks/useMoveCampStage')
vi.mock('@/features/camps/hooks/useActivateCamp')

function mockMoveStage(overrides: Partial<ReturnType<typeof useMoveCampStage>> = {}) {
  vi.mocked(useMoveCampStage).mockReturnValue({
    mutate: vi.fn(), isPending: false, isError: false, error: null, ...overrides,
  } as unknown as ReturnType<typeof useMoveCampStage>)
}

function mockActivate(overrides: Partial<ReturnType<typeof useActivateCamp>> = {}) {
  vi.mocked(useActivateCamp).mockReturnValue({
    mutate: vi.fn(), isPending: false, isError: false, error: null, ...overrides,
  } as unknown as ReturnType<typeof useActivateCamp>)
}

function campFixture(overrides: Partial<CampEntity> = {}): CampEntity {
  return {
    id: 'camp-1', code: 'cmp-000001',
    tenant: { _id: 't-1', code: 'migtest', name: 'Migration Test Client' },
    division: null, project: null, doctor: null,
    type: 'screening', billingType: 'billable', patientExpectation: 40,
    fo: { _id: 'fo-1', code: 'fo-001', name: 'Ravi Kumar' },
    dietitian: null,
    mr: null, asm: null, rsm: null,
    date: '2026-09-20', timeSlot: '9am-1pm',
    location: null,
    devices: [], notes: '', status: 'confirmed', stageHistory: [],
    createdAt: '', updatedAt: '', ...overrides,
  } as unknown as CampEntity
}

// A camp "today" relative to the fixtures' fixed dates below, used only by the date-gate tests.
const TODAY_ISO = '2026-09-20T12:00:00.000Z'

describe('CampStageActionRow — Start (Live) date gate (mirrors backend activate()\'s scheduled-day check)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockMoveStage()
    mockActivate()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(TODAY_ISO))
  })

  afterEach(() => vi.useRealTimers())

  it('shows Start (Live), enabled, for a confirmed camp on its scheduled day', () => {
    render(<CampStageActionRow camp={campFixture({ status: 'confirmed', date: '2026-09-20' })} canMoveStage={false} canActivate />)

    const button = screen.getByRole('button', { name: /start \(live\)/i })
    expect(button).toBeInTheDocument()
    expect(button).not.toBeDisabled()
  })

  it('disables Start (Live) for a future-dated confirmed camp and shows VISIBLE explanatory text, instead of letting the FO hit a predictable 422', () => {
    render(<CampStageActionRow camp={campFixture({ status: 'confirmed', date: '2026-09-25' })} canMoveStage={false} canActivate />)

    const button = screen.getByRole('button', { name: /start \(live\)/i })
    expect(button).toBeDisabled()
    // Not a `title` attribute — a disabled Button has pointer-events-none, so a hover-only
    // tooltip would never be reachable. Must be real, always-visible text instead.
    expect(screen.getByText(/available on/i)).toBeInTheDocument()
  })

  it('does not render Start (Live) at all when canActivate is false (not the assigned worker)', () => {
    render(<CampStageActionRow camp={campFixture({ status: 'confirmed' })} canMoveStage={false} canActivate={false} />)

    expect(screen.queryByRole('button', { name: /start \(live\)/i })).not.toBeInTheDocument()
  })

  it('does not render Start (Live) for a non-confirmed camp even when canActivate is true', () => {
    render(<CampStageActionRow camp={campFixture({ status: 'requested' })} canMoveStage={false} canActivate />)

    expect(screen.queryByRole('button', { name: /start \(live\)/i })).not.toBeInTheDocument()
  })

  it('a dietitian activating their own confirmed diet camp sees the same Start (Live) action', () => {
    render(
      <CampStageActionRow
        camp={campFixture({ status: 'confirmed', date: '2026-09-20', type: 'diet', fo: null, dietitian: { _id: 'diet-1', code: 'dt-001', name: 'Priya Rao' } })}
        canMoveStage={false}
        canActivate
      />,
    )

    expect(screen.getByRole('button', { name: /start \(live\)/i })).toBeInTheDocument()
  })

  it('does not double-offer Start (Live) when the viewer can also moveStage (manager path already covers confirmed→live)', () => {
    render(<CampStageActionRow camp={campFixture({ status: 'confirmed' })} canMoveStage canActivate />)

    // Only one "Start (Live)"-labelled control should render, not two competing buttons.
    expect(screen.getAllByRole('button', { name: /start \(live\)/i })).toHaveLength(1)
  })
})

// Real timers here — userEvent's internal delays deadlock against fake timers without extra
// plumbing, and these tests only care about interaction/mutation behavior, not "today" vs a date.
describe('CampStageActionRow — Start (Live) mutation lifecycle', () => {
  const sameDayCamp = () => campFixture({ status: 'confirmed', date: new Date().toISOString().slice(0, 10) })

  beforeEach(() => {
    vi.useRealTimers()
    vi.resetAllMocks()
    mockMoveStage()
    mockActivate()
  })

  it('submits the activate mutation with an optional reason (trimmed to undefined when blank)', async () => {
    const mutate = vi.fn()
    mockActivate({ mutate } as Partial<ReturnType<typeof useActivateCamp>>)
    const user = userEvent.setup()
    render(<CampStageActionRow camp={sameDayCamp()} canMoveStage={false} canActivate />)

    await user.click(screen.getByRole('button', { name: /start \(live\)/i }))
    await user.click(screen.getByRole('button', { name: /^confirm$/i }))

    expect(mutate).toHaveBeenCalledWith({ reason: undefined }, expect.objectContaining({ onSuccess: expect.any(Function) }))
  })

  it('submits the activate mutation with a trimmed reason when one is provided', async () => {
    const mutate = vi.fn()
    mockActivate({ mutate } as Partial<ReturnType<typeof useActivateCamp>>)
    const user = userEvent.setup()
    render(<CampStageActionRow camp={sameDayCamp()} canMoveStage={false} canActivate />)

    await user.click(screen.getByRole('button', { name: /start \(live\)/i }))
    await user.type(screen.getByPlaceholderText('Optional'), '  On site, starting now  ')
    await user.click(screen.getByRole('button', { name: /^confirm$/i }))

    expect(mutate).toHaveBeenCalledWith({ reason: 'On site, starting now' }, expect.anything())
  })

  it('does NOT require a reason to submit activation, unlike the manager moveStage dialog', async () => {
    const mutate = vi.fn()
    mockActivate({ mutate } as Partial<ReturnType<typeof useActivateCamp>>)
    const user = userEvent.setup()
    render(<CampStageActionRow camp={sameDayCamp()} canMoveStage={false} canActivate />)

    await user.click(screen.getByRole('button', { name: /start \(live\)/i }))
    await user.click(screen.getByRole('button', { name: /^confirm$/i }))

    expect(mutate).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Reason is required')).not.toBeInTheDocument()
  })

  it('closes the dialog on activation success', async () => {
    const mutate = vi.fn((_payload, opts) => opts.onSuccess?.())
    mockActivate({ mutate } as Partial<ReturnType<typeof useActivateCamp>>)
    const user = userEvent.setup()
    render(<CampStageActionRow camp={sameDayCamp()} canMoveStage={false} canActivate />)

    await user.click(screen.getByRole('button', { name: /start \(live\)/i }))
    await user.click(screen.getByRole('button', { name: /^confirm$/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the backend error message and keeps the dialog open on activation failure', async () => {
    mockActivate({
      mutate: vi.fn(),
      isError: true,
      error: { response: { data: { message: 'Only a confirmed camp can be started' } } },
    } as unknown as Partial<ReturnType<typeof useActivateCamp>>)
    const user = userEvent.setup()
    render(<CampStageActionRow camp={sameDayCamp()} canMoveStage={false} canActivate />)

    await user.click(screen.getByRole('button', { name: /start \(live\)/i }))

    expect(screen.getByText('Only a confirmed camp can be started')).toBeInTheDocument()
  })
})
