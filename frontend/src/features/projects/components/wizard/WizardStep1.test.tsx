import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DEFAULT_WIZARD_FORM } from '@/features/projects/wizard.types'
import WizardStep1 from './WizardStep1'

vi.mock('@/features/test-master/test.service', () => ({
  testService: { searchTests: vi.fn() },
}))
vi.mock('@/hooks/usePermission')

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

const ecgTest = { id: 't-1', code: 'tst-000001', name: 'ECG', therapy: 'cardiology', campType: 'screening', duration: 15, price: 250, consumption: [] }
const dietTest = { id: 't-2', code: 'tst-000002', name: 'Diet Plan Review', therapy: 'cardiology', campType: 'diet', duration: 30, price: 400, consumption: [] }

function testsResponse(items: typeof ecgTest[]) {
  return { success: true, message: '', data: { items, count: items.length } } as never
}

// Every existing test in this file assumes the actor CAN browse the test
// catalog (the norm for every default role type that reaches this wizard
// today) — canBrowseTests=false is exercised separately, by its own tests.
async function mockPermission(canBrowseTests = true) {
  const { usePermission } = await import('@/hooks/usePermission')
  vi.mocked(usePermission).mockReturnValue({
    hasAnyPermission: (codes: string[]) => canBrowseTests && codes.includes('test-master:search'),
  } as unknown as ReturnType<typeof usePermission>)
}

async function renderStep(form: typeof DEFAULT_WIZARD_FORM, setField = vi.fn(), canBrowseTests = true) {
  await mockPermission(canBrowseTests)
  const client = makeQueryClient()
  const { rerender } = render(
    <QueryClientProvider client={client}>
      <WizardStep1 form={form} setField={setField} />
    </QueryClientProvider>,
  )
  // Lets a test simulate the parent re-rendering with an updated form (e.g.
  // after a real project-type change), without remounting — remounting would
  // reset all internal hook state and could never reproduce a stale-cache bug
  // that only manifests when a hook's state genuinely transitions in place.
  const rerenderWithForm = (nextForm: typeof DEFAULT_WIZARD_FORM) =>
    rerender(
      <QueryClientProvider client={client}>
        <WizardStep1 form={nextForm} setField={setField} />
      </QueryClientProvider>,
    )
  return { setField, rerenderWithForm }
}

describe('WizardStep1 — therapy + project-type-filtered tests', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('does not query tests at all while no therapy is selected', async () => {
    const { testService } = await import('@/features/test-master/test.service')

    await renderStep({ ...DEFAULT_WIZARD_FORM, therapy: '', type: ['screening_camp'] })

    expect(screen.getByText(/select a therapy to see available tests/i)).toBeInTheDocument()
    expect(testService.searchTests).not.toHaveBeenCalled()
  })

  it('does not query tests while a therapy is picked but no project type is selected yet', async () => {
    const { testService } = await import('@/features/test-master/test.service')

    await renderStep({ ...DEFAULT_WIZARD_FORM, therapy: 'cardiology', type: [] })

    expect(screen.getByText(/select a project type to see available tests/i)).toBeInTheDocument()
    expect(testService.searchTests).not.toHaveBeenCalled()
  })

  it('queries only the camp type(s) derived from the selected project type — screening_camp scopes to campType=screening only', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.searchTests).mockResolvedValue(testsResponse([ecgTest]))

    await renderStep({ ...DEFAULT_WIZARD_FORM, therapy: 'cardiology', type: ['screening_camp'] })

    await waitFor(() => expect(testService.searchTests).toHaveBeenCalledWith(expect.objectContaining({ therapy: 'cardiology', campType: 'screening', status: 'active' })))
    expect(testService.searchTests).not.toHaveBeenCalledWith(expect.objectContaining({ campType: 'diet' }))
    expect(testService.searchTests).not.toHaveBeenCalledWith(expect.objectContaining({ campType: 'lab' }))
    expect(await screen.findByRole('button', { name: 'ECG' })).toBeInTheDocument()
    expect(testService.searchTests).toHaveBeenCalledTimes(1)
  })

  it('queries every camp type when project type is "mixed" — mixed is a real, selectable type, not removed', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.searchTests).mockResolvedValue(testsResponse([]))

    await renderStep({ ...DEFAULT_WIZARD_FORM, therapy: 'cardiology', type: ['mixed'] })

    await waitFor(() => {
      expect(testService.searchTests).toHaveBeenCalledWith(expect.objectContaining({ campType: 'screening' }))
      expect(testService.searchTests).toHaveBeenCalledWith(expect.objectContaining({ campType: 'diet' }))
      expect(testService.searchTests).toHaveBeenCalledWith(expect.objectContaining({ campType: 'lab' }))
    })
  })

  it('merges camp types across more than one selected project type (diet + lab_test → diet and lab, not screening)', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.searchTests).mockResolvedValue(testsResponse([]))

    await renderStep({ ...DEFAULT_WIZARD_FORM, therapy: 'cardiology', type: ['diet', 'lab_test'] })

    await waitFor(() => {
      expect(testService.searchTests).toHaveBeenCalledWith(expect.objectContaining({ campType: 'diet' }))
      expect(testService.searchTests).toHaveBeenCalledWith(expect.objectContaining({ campType: 'lab' }))
    })
    expect(testService.searchTests).not.toHaveBeenCalledWith(expect.objectContaining({ campType: 'screening' }))
  })

  it('sends real Test ids (not the old enum strings) when a chip is toggled', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.searchTests).mockResolvedValue(testsResponse([ecgTest]))

    const user = userEvent.setup()
    const { setField } = await renderStep({ ...DEFAULT_WIZARD_FORM, therapy: 'cardiology', type: ['screening_camp'] })

    await user.click(await screen.findByRole('button', { name: 'ECG' }))

    expect(setField).toHaveBeenCalledWith('tests', ['t-1'])
  })

  it('clears already-selected tests when therapy changes, in the same update', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.searchTests).mockResolvedValue(testsResponse([]))

    const user = userEvent.setup()
    const { setField } = await renderStep({ ...DEFAULT_WIZARD_FORM, therapy: 'cardiology', type: ['screening_camp'], tests: ['old-cardio-test-id'] })

    await user.click(screen.getByRole('combobox', { name: '' }))
    const option = await screen.findByRole('option', { name: /pulmonology/i })
    await user.click(option)

    expect(setField).toHaveBeenCalledWith('therapy', 'pulmonology')
    expect(setField).toHaveBeenCalledWith('tests', [])
  })

  it('clears already-selected tests when project type changes — a test valid for the old type set may not be for the new one', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.searchTests).mockResolvedValue(testsResponse([]))

    const user = userEvent.setup()
    const { setField } = await renderStep({ ...DEFAULT_WIZARD_FORM, therapy: 'cardiology', type: ['screening_camp'], tests: ['old-screening-test-id'] })

    await user.click(screen.getByRole('button', { name: /^Diet$/i }))

    expect(setField).toHaveBeenCalledWith('type', ['screening_camp', 'diet'])
    expect(setField).toHaveBeenCalledWith('tests', [])
  })

  it('shows a retry-able error state, not a false "no tests configured" message, when the tests query fails', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.searchTests).mockRejectedValue(new Error('network error'))

    await renderStep({ ...DEFAULT_WIZARD_FORM, therapy: 'cardiology', type: ['screening_camp'] })

    expect(await screen.findByText(/couldn.t load tests/i)).toBeInTheDocument()
    expect(screen.queryByText(/no tests configured/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('retries the tests query when Retry is clicked after a failure', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.searchTests)
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce(testsResponse([ecgTest]))

    const user = userEvent.setup()
    await renderStep({ ...DEFAULT_WIZARD_FORM, therapy: 'cardiology', type: ['screening_camp'] })

    await user.click(await screen.findByRole('button', { name: /retry/i }))

    expect(await screen.findByRole('button', { name: 'ECG' })).toBeInTheDocument()
  })

  it('drops a previously-loaded camp type\'s cached tests once that camp type is no longer selected — the Diet slot going inactive must not leak into the merged list', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.searchTests).mockImplementation(async (q) => {
      if (q.campType === 'diet') return { success: true, message: '', data: { items: [dietTest], count: 1 } } as never
      if (q.campType === 'screening') return { success: true, message: '', data: { items: [ecgTest], count: 1 } } as never
      return { success: true, message: '', data: { items: [], count: 0 } } as never
    })

    const { rerenderWithForm } = await renderStep({ ...DEFAULT_WIZARD_FORM, therapy: 'cardiology', type: ['diet'] })

    expect(await screen.findByRole('button', { name: 'Diet Plan Review' })).toBeInTheDocument()

    await rerenderWithForm({ ...DEFAULT_WIZARD_FORM, therapy: 'cardiology', type: ['screening_camp'] })

    expect(await screen.findByRole('button', { name: 'ECG' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Diet Plan Review' })).not.toBeInTheDocument()
  })

  it('does not let a forced refetch() repopulate an inactive camp type\'s tests — Retry must only refetch active slots', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    let dietCallCount = 0
    vi.mocked(testService.searchTests).mockImplementation(async (q) => {
      if (q.campType === 'diet') {
        dietCallCount += 1
        return { success: true, message: '', data: { items: [dietTest], count: 1 } } as never
      }
      if (q.campType === 'screening') return { success: true, message: '', data: { items: [ecgTest], count: 1 } } as never
      return { success: true, message: '', data: { items: [], count: 0 } } as never
    })

    const { rerenderWithForm } = await renderStep({ ...DEFAULT_WIZARD_FORM, therapy: 'cardiology', type: ['diet'] })
    expect(await screen.findByRole('button', { name: 'Diet Plan Review' })).toBeInTheDocument()
    const dietCallsBeforeSwitch = dietCallCount

    await rerenderWithForm({ ...DEFAULT_WIZARD_FORM, therapy: 'cardiology', type: ['screening_camp'] })
    expect(await screen.findByRole('button', { name: 'ECG' })).toBeInTheDocument()

    // Force the failure path on the now-active Screening slot, then Retry —
    // this calls the outer hook's refetch(), which must skip the now-inactive
    // Diet slot rather than issuing another campType=diet request for it.
    vi.mocked(testService.searchTests).mockImplementationOnce(async () => { throw new Error('network error') })
    await rerenderWithForm({ ...DEFAULT_WIZARD_FORM, therapy: 'pulmonology', type: ['screening_camp'] })
    const retryButton = await screen.findByRole('button', { name: /retry/i })

    const user = userEvent.setup()
    await user.click(retryButton)

    await waitFor(() => expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument())
    expect(dietCallCount).toBe(dietCallsBeforeSwitch)
    expect(screen.queryByRole('button', { name: 'Diet Plan Review' })).not.toBeInTheDocument()
  })

  it('shows a "Load more tests" button only when more pages exist, and loading more accumulates rather than replaces', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    const page1 = Array.from({ length: 20 }, (_, i) => ({ ...ecgTest, id: `t-${i}`, name: `ECG ${i}` }))
    const page2 = [{ ...ecgTest, id: 't-20', name: 'ECG 20' }]
    vi.mocked(testService.searchTests).mockImplementation(async (q) => {
      if (q.page === '2') return { success: true, message: '', data: { items: page2, count: 21 } } as never
      return { success: true, message: '', data: { items: page1, count: 21 } } as never
    })

    const user = userEvent.setup()
    await renderStep({ ...DEFAULT_WIZARD_FORM, therapy: 'cardiology', type: ['screening_camp'] })

    expect(await screen.findByRole('button', { name: 'ECG 0' })).toBeInTheDocument()
    const loadMore = screen.getByRole('button', { name: /load more tests/i })
    await user.click(loadMore)

    expect(await screen.findByRole('button', { name: 'ECG 20' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ECG 0' })).toBeInTheDocument()
  })

  it('shows a permission message instead of querying the test catalog when the actor lacks test-master:search/manage', async () => {
    const { testService } = await import('@/features/test-master/test.service')

    await renderStep({ ...DEFAULT_WIZARD_FORM, therapy: 'cardiology', type: ['screening_camp'] }, vi.fn(), false)

    expect(await screen.findByText(/don't have permission to browse the test catalog/i)).toBeInTheDocument()
    expect(testService.searchTests).not.toHaveBeenCalled()
  })

  it('clears already-selected tests if canBrowseTests transitions to false while the wizard is open', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.searchTests).mockResolvedValue(testsResponse([ecgTest]))

    const setField = vi.fn()
    const { rerenderWithForm } = await renderStep({ ...DEFAULT_WIZARD_FORM, therapy: 'cardiology', type: ['screening_camp'], tests: ['t-1'] }, setField)
    await screen.findByRole('button', { name: 'ECG' })
    setField.mockClear()

    // Simulate a session refetch revoking the permission mid-wizard.
    await mockPermission(false)
    await rerenderWithForm({ ...DEFAULT_WIZARD_FORM, therapy: 'cardiology', type: ['screening_camp'], tests: ['t-1'] })

    await waitFor(() => expect(setField).toHaveBeenCalledWith('tests', []))
  })
})
