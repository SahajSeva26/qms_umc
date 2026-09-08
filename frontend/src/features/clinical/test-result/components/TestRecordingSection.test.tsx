import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { CampEntity } from '@/types/campReal.types'

vi.mock('@/features/test-master/test.service', () => ({
  testService: { searchTests: vi.fn(), getTest: vi.fn(), createTest: vi.fn(), updateTest: vi.fn() },
}))
vi.mock('@/features/clinical/test-result/testResult.service', () => ({
  testResultService: { searchTestResults: vi.fn(), getTestResult: vi.fn(), createTestResult: vi.fn(), updateTestResult: vi.fn() },
}))

function campFixture(overrides: Partial<CampEntity> = {}): CampEntity {
  return {
    id: 'camp-1', code: 'cmp-000001', tenant: 't-1', division: 'div-1', project: { _id: 'proj-1', name: 'Cardio Screening', tests: ['tm-1'] },
    doctor: 'doc-1', type: 'screening', billingType: 'billable', patientExpectation: 0,
    fo: null, mr: null, date: '2026-09-15', timeSlot: '9am-1pm', city: 'Pune', state: 'Maharashtra',
    coordinates: [73.8567, 18.5204], devices: [], status: 'live', stageHistory: [],
    createdAt: '', updatedAt: '', ...overrides,
  } as CampEntity
}

function testMasterFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tm-1', code: 'tst-000001', name: 'Blood Sugar Test', therapy: 'diabetes', campType: 'screening', duration: 10, price: 100,
    consumption: [], config: { inputs: [{ label: 'Blood Sugar Level', type: 'number', unit: 'mg/dL' }] },
    ...overrides,
  }
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderSection(camp: CampEntity) {
  const { testResultService } = await import('@/features/clinical/test-result/testResult.service')
  vi.mocked(testResultService.searchTestResults).mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })

  const TestRecordingSection = (await import('./TestRecordingSection')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <TestRecordingSection camp={camp} screeningId="scr-1" />
    </QueryClientProvider>,
  )
}

describe('TestRecordingSection', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows a distinct "unavailable, reload" message — not "no tests configured" — when camp.project is a raw, unpopulated id', async () => {
    await renderSection(campFixture({ project: 'proj-1' }))

    expect(await screen.findByText(/the camp's test set is unavailable — reload the camp/i)).toBeInTheDocument()
    expect(screen.queryByText(/no tests are configured/i)).not.toBeInTheDocument()
  })

  it('shows a real empty state, not a broken form, when the camp has no linked project', async () => {
    await renderSection(campFixture({ project: null }))

    expect(await screen.findByText(/no linked project/i)).toBeInTheDocument()
  })

  it('shows an empty state when the project has no tests configured at all', async () => {
    await renderSection(campFixture({ project: { _id: 'proj-1', name: 'Cardio Screening', tests: [] } }))

    expect(await screen.findByText(/no tests are configured for this camp's project/i)).toBeInTheDocument()
  })

  it('shows a distinct "wrong camp type" empty state — not the "no tests configured" one — when every resolved TestMaster is filtered out by campType', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.getTest).mockResolvedValue({
      success: true,
      message: '',
      data: testMasterFixture({ campType: 'diet' }),
    } as never)

    await renderSection(campFixture({ type: 'screening' }))

    expect(await screen.findByText(/no tests are configured for this camp type/i)).toBeInTheDocument()
    expect(screen.queryByText(/no tests are configured for this camp's project/i)).not.toBeInTheDocument()
  })

  it('excludes a mismatched-campType TestMaster from the rendered forms while keeping a matching one', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.getTest).mockImplementation(async (id: string) => ({
      success: true,
      message: '',
      data: id === 'tm-1' ? testMasterFixture({ id: 'tm-1', name: 'Screening Test', campType: 'screening' }) : testMasterFixture({ id: 'tm-2', name: 'Diet Test', campType: 'diet' }),
    }) as never)

    await renderSection(campFixture({ type: 'screening', project: { _id: 'proj-1', name: 'p', tests: ['tm-1', 'tm-2'] } }))

    expect(await screen.findByText('Screening Test')).toBeInTheDocument()
    expect(screen.queryByText('Diet Test')).not.toBeInTheDocument()
  })

  it('shows "couldn\'t load one or more tests" on a TestMaster fetch failure — not the campType-filter empty state', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.getTest).mockRejectedValue(new Error('network error'))

    await renderSection(campFixture())

    expect(await screen.findByText(/couldn't load one or more tests in this camp's test set/i)).toBeInTheDocument()
    expect(screen.queryByText(/no tests are configured for this camp type/i)).not.toBeInTheDocument()
  })

  it('shows "Loading tests…" while the TestMaster fetch is pending — not the campType-filter empty state, even though resolved tests are still empty', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    // Never resolves during this test — simulates an in-flight request.
    vi.mocked(testService.getTest).mockImplementation(() => new Promise(() => {}))

    await renderSection(campFixture())

    expect(await screen.findByText(/loading tests…/i)).toBeInTheDocument()
    expect(screen.queryByText(/no tests are configured for this camp type/i)).not.toBeInTheDocument()
  })

  it('transitions from "Loading tests…" to the campType-filter empty state once the pending fetch resolves to a mismatched result — proves the actual precedence, not just the pending state', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    let resolveFetch: (value: unknown) => void = () => {}
    vi.mocked(testService.getTest).mockImplementation(() => new Promise((resolve) => { resolveFetch = resolve }) as never)

    await renderSection(campFixture({ type: 'screening' }))

    expect(await screen.findByText(/loading tests…/i)).toBeInTheDocument()

    resolveFetch({ success: true, message: '', data: testMasterFixture({ campType: 'diet' }) })

    expect(await screen.findByText(/no tests are configured for this camp type/i)).toBeInTheDocument()
    expect(screen.queryByText(/loading tests…/i)).not.toBeInTheDocument()
  })

  it('renders a recording form for each TestMaster in the project\'s test set', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.getTest).mockResolvedValue({
      success: true,
      message: '',
      data: testMasterFixture(),
    } as never)

    await renderSection(campFixture())

    expect(await screen.findByText('Blood Sugar Test')).toBeInTheDocument()
    expect(screen.getByText(/Blood Sugar Level \(mg\/dL\)/i)).toBeInTheDocument()
  })
})
