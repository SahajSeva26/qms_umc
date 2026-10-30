import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { WizardFormState } from '@/features/projects/wizard.types'
import { WizardTestHarness } from './wizardTestHarness'
import WizardStep1 from './WizardStep1'

vi.mock('@/features/test-master/test.service', () => ({
  testService: { searchTests: vi.fn() },
}))
vi.mock('@/hooks/usePermission')
const stubCreatedTest = { id: 't-new', code: 'tst-000099', name: 'New Test', therapy: 'cardiology', campType: 'screening', duration: 10, price: 100, consumption: [] }
// Deliberately a different therapy/campType than the default fixtures (cardiology/screening) —
// simulates an admin creating an unrelated test, unconstrained by the project being built.
const stubMismatchedTest = { id: 't-mismatch', code: 'tst-000098', name: 'Oncology Lab Test', therapy: 'oncology', campType: 'lab', duration: 20, price: 500, consumption: [] }

vi.mock('@/features/test-master/components/EditTestModal', () => ({
  default: ({ onClose }: { onClose: (createdTest?: typeof stubCreatedTest) => void }) => (
    <div>
      New test modal stub
      <button type="button" onClick={() => onClose()}>Close stub modal (no test created)</button>
      <button type="button" onClick={() => onClose(stubCreatedTest)}>Close stub modal (test created)</button>
      <button type="button" onClick={() => onClose(stubMismatchedTest)}>Close stub modal (mismatched test created)</button>
    </div>
  ),
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

const ecgTest = { id: 't-1', code: 'tst-000001', name: 'ECG', therapy: 'cardiology', campType: 'screening', duration: 15, price: 250, consumption: [] }
const dietTest = { id: 't-2', code: 'tst-000002', name: 'Diet Plan Review', therapy: 'cardiology', campType: 'diet', duration: 30, price: 400, consumption: [] }

function testsResponse(items: typeof ecgTest[]) {
  return { success: true, message: '', data: { items, count: items.length } } as never
}

async function mockPermission(canBrowseTests = true, canCreateTest = false) {
  const { usePermission } = await import('@/hooks/usePermission')
  vi.mocked(usePermission).mockReturnValue({
    hasAnyPermission: (codes: string[]) =>
      (canBrowseTests && codes.includes('test-master:search')) || (canCreateTest && codes.includes('test-master:manage')),
  } as unknown as ReturnType<typeof usePermission>)
}

async function renderStep(defaultValues: Partial<WizardFormState>, canBrowseTests = true, canCreateTest = false) {
  await mockPermission(canBrowseTests, canCreateTest)
  const client = makeQueryClient()
  const { rerender } = render(
    <QueryClientProvider client={client}>
      <WizardTestHarness formValues={defaultValues}>
        <WizardStep1 />
      </WizardTestHarness>
    </QueryClientProvider>,
  )
  // Simulates a form-state change by remounting a fresh harness instance
  // with new defaultValues, since WizardStep1 itself has no props to vary.
  const rerenderWithForm = (nextDefaultValues: Partial<WizardFormState>) =>
    rerender(
      <QueryClientProvider client={client}>
        <WizardTestHarness formValues={nextDefaultValues}>
          <WizardStep1 />
        </WizardTestHarness>
      </QueryClientProvider>,
    )
  return { rerenderWithForm }
}

describe('WizardStep1 — therapy + project-type-filtered tests', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('does not query tests at all while no therapy is selected', async () => {
    const { testService } = await import('@/features/test-master/test.service')

    await renderStep({ therapy: '', type: ['screening'] })

    expect(screen.getByText(/select a therapy to see available tests/i)).toBeInTheDocument()
    expect(testService.searchTests).not.toHaveBeenCalled()
  })

  it('does not query tests while a therapy is picked but no project type is selected yet', async () => {
    const { testService } = await import('@/features/test-master/test.service')

    await renderStep({ therapy: 'cardiology', type: [] })

    expect(screen.getByText(/select a project type to see available tests/i)).toBeInTheDocument()
    expect(testService.searchTests).not.toHaveBeenCalled()
  })

  it('queries only the camp type(s) derived from the selected project type — screening scopes to campType=screening only', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.searchTests).mockResolvedValue(testsResponse([ecgTest]))

    await renderStep({ therapy: 'cardiology', type: ['screening'] })

    await waitFor(() => expect(testService.searchTests).toHaveBeenCalledWith(expect.objectContaining({ therapy: 'cardiology', campType: 'screening', status: 'active' })))
    expect(testService.searchTests).not.toHaveBeenCalledWith(expect.objectContaining({ campType: 'diet' }))
    expect(testService.searchTests).not.toHaveBeenCalledWith(expect.objectContaining({ campType: 'lab' }))
    expect(await screen.findByRole('button', { name: 'ECG' })).toBeInTheDocument()
    expect(testService.searchTests).toHaveBeenCalledTimes(1)
  })

  it('queries every camp type when all three real project types are selected — there is no separate "mixed" value, picking multiple types IS mixed', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.searchTests).mockResolvedValue(testsResponse([]))

    await renderStep({ therapy: 'cardiology', type: ['screening', 'diet', 'lab'] })

    await waitFor(() => {
      expect(testService.searchTests).toHaveBeenCalledWith(expect.objectContaining({ campType: 'screening' }))
      expect(testService.searchTests).toHaveBeenCalledWith(expect.objectContaining({ campType: 'diet' }))
      expect(testService.searchTests).toHaveBeenCalledWith(expect.objectContaining({ campType: 'lab' }))
    })
  })

  it('merges camp types across more than one selected project type (diet + lab → diet and lab, not screening)', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.searchTests).mockResolvedValue(testsResponse([]))

    await renderStep({ therapy: 'cardiology', type: ['diet', 'lab'] })

    await waitFor(() => {
      expect(testService.searchTests).toHaveBeenCalledWith(expect.objectContaining({ campType: 'diet' }))
      expect(testService.searchTests).toHaveBeenCalledWith(expect.objectContaining({ campType: 'lab' }))
    })
    expect(testService.searchTests).not.toHaveBeenCalledWith(expect.objectContaining({ campType: 'screening' }))
  })

  it('marks a test chip active once clicked (the underlying form field takes the real Test id, not the old enum strings)', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.searchTests).mockResolvedValue(testsResponse([ecgTest]))

    const user = userEvent.setup()
    await renderStep({ therapy: 'cardiology', type: ['screening'] })

    const chip = await screen.findByRole('button', { name: 'ECG' })
    await user.click(chip)

    expect(chip).toHaveStyle({ background: 'var(--qms-brand)' })
  })

  it('clears already-selected tests when therapy changes, in the same update', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.searchTests).mockResolvedValue(testsResponse([ecgTest]))

    const user = userEvent.setup()
    await renderStep({ therapy: 'cardiology', type: ['screening'], tests: [ecgTest.id] })

    const ecgChipBefore = await screen.findByRole('button', { name: 'ECG' })
    expect(ecgChipBefore).toHaveStyle({ background: 'var(--qms-brand)' })

    await user.click(screen.getByRole('combobox', { name: '' }))
    const option = await screen.findByRole('option', { name: /pulmonology/i })
    await user.click(option)

    await waitFor(() => expect(testService.searchTests).toHaveBeenCalledWith(expect.objectContaining({ therapy: 'pulmonology' })))
    const ecgChipAfter = await screen.findByRole('button', { name: 'ECG' })
    expect(ecgChipAfter).not.toHaveStyle({ background: 'var(--qms-brand)' })
  })

  it('clears already-selected tests when project type changes — a test valid for the old type set may not be for the new one', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.searchTests).mockResolvedValue(testsResponse([ecgTest]))

    const user = userEvent.setup()
    await renderStep({ therapy: 'cardiology', type: ['screening'], tests: [ecgTest.id] })

    const ecgChipBefore = await screen.findByRole('button', { name: 'ECG' })
    expect(ecgChipBefore).toHaveStyle({ background: 'var(--qms-brand)' })

    await user.click(screen.getByRole('button', { name: /^Diet$/i }))

    await waitFor(() => expect(testService.searchTests).toHaveBeenCalledWith(expect.objectContaining({ campType: 'diet' })))
    const ecgChipAfter = await screen.findByRole('button', { name: 'ECG' })
    expect(ecgChipAfter).not.toHaveStyle({ background: 'var(--qms-brand)' })
  })

  it('shows a retry-able error state, not a false "no tests configured" message, when the tests query fails', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.searchTests).mockRejectedValue(new Error('network error'))

    await renderStep({ therapy: 'cardiology', type: ['screening'] })

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
    await renderStep({ therapy: 'cardiology', type: ['screening'] })

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

    const { rerenderWithForm } = await renderStep({ therapy: 'cardiology', type: ['diet'] })

    expect(await screen.findByRole('button', { name: 'Diet Plan Review' })).toBeInTheDocument()

    await rerenderWithForm({ therapy: 'cardiology', type: ['screening'] })

    expect(await screen.findByRole('button', { name: 'ECG' })).toBeInTheDocument()
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
    await renderStep({ therapy: 'cardiology', type: ['screening'] })

    expect(await screen.findByRole('button', { name: 'ECG 0' })).toBeInTheDocument()
    const loadMore = screen.getByRole('button', { name: /load more tests/i })
    await user.click(loadMore)

    expect(await screen.findByRole('button', { name: 'ECG 20' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ECG 0' })).toBeInTheDocument()
  })

  it('shows a permission message instead of querying the test catalog when the actor lacks test-master:search/manage', async () => {
    const { testService } = await import('@/features/test-master/test.service')

    await renderStep({ therapy: 'cardiology', type: ['screening'] }, false)

    expect(await screen.findByText(/don't have permission to browse the test catalog/i)).toBeInTheDocument()
    expect(testService.searchTests).not.toHaveBeenCalled()
  })

  it('clears already-selected tests if canBrowseTests transitions to false while the wizard is open', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.searchTests).mockResolvedValue(testsResponse([ecgTest]))

    const { rerenderWithForm } = await renderStep({ therapy: 'cardiology', type: ['screening'], tests: ['t-1'] })
    const chip = await screen.findByRole('button', { name: 'ECG' })
    expect(chip).toHaveStyle({ background: 'var(--qms-brand)' })

    // Simulate a session refetch revoking the permission mid-wizard.
    await mockPermission(false)
    await rerenderWithForm({ therapy: 'cardiology', type: ['screening'], tests: ['t-1'] })

    expect(await screen.findByText(/don't have permission to browse the test catalog/i)).toBeInTheDocument()
  })
})

// POST /test-masters requires test-master:manage — search/get alone (sales roles) can't create,
// matching the prototype's admin/ops-manager-only Test master tab access.
describe('WizardStep1 — "Add test" inline creation, gated on test-master:manage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('hides "Add test" for an actor with only test-master:search (e.g. Sales Rep/Sales Head)', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.searchTests).mockResolvedValue(testsResponse([ecgTest]))

    await renderStep({ therapy: 'cardiology', type: ['screening'] }, true, false)

    await screen.findByRole('button', { name: 'ECG' })
    expect(screen.queryByRole('button', { name: /add test/i })).not.toBeInTheDocument()
  })

  it('shows "Add test" for an actor holding test-master:manage (e.g. Ops Manager/Admin)', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.searchTests).mockResolvedValue(testsResponse([ecgTest]))

    await renderStep({ therapy: 'cardiology', type: ['screening'] }, true, true)

    expect(await screen.findByRole('button', { name: /add test/i })).toBeInTheDocument()
  })

  it('opens the new-test modal on click and refetches the test list on close, with no test created', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.searchTests).mockResolvedValue(testsResponse([ecgTest]))

    const user = userEvent.setup()
    await renderStep({ therapy: 'cardiology', type: ['screening'] }, true, true)

    await user.click(await screen.findByRole('button', { name: /add test/i }))
    expect(screen.getByText('New test modal stub')).toBeInTheDocument()

    const callsBeforeClose = vi.mocked(testService.searchTests).mock.calls.length
    await user.click(screen.getByRole('button', { name: /no test created/i }))

    expect(screen.queryByText('New test modal stub')).not.toBeInTheDocument()
    await waitFor(() => expect(vi.mocked(testService.searchTests).mock.calls.length).toBeGreaterThan(callsBeforeClose))
    // ECG, the only pre-existing test, stays unselected — nothing was auto-attached.
    expect(screen.getByRole('button', { name: 'ECG' })).not.toHaveStyle({ background: 'var(--qms-brand)' })
  })

  it('auto-attaches the newly created test — selected immediately once it appears in the refetched list, no manual click needed', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    // Before creating: only ECG exists. After the post-close refetch: the new test is also back
    // from the server (matches real behaviour — the create lands in the catalog, then the wizard
    // re-queries it), proving the auto-attach set the real test id, not just a stub id nothing renders.
    vi.mocked(testService.searchTests)
      .mockResolvedValueOnce(testsResponse([ecgTest]))
      .mockResolvedValue(testsResponse([ecgTest, stubCreatedTest]))

    const user = userEvent.setup()
    await renderStep({ therapy: 'cardiology', type: ['screening'] }, true, true)

    await user.click(await screen.findByRole('button', { name: /add test/i }))
    await user.click(screen.getByRole('button', { name: /^close stub modal \(test created\)$/i }))

    expect(screen.queryByText('New test modal stub')).not.toBeInTheDocument()
    // The newly created test is selected immediately once it appears in the list.
    expect(await screen.findByRole('button', { name: 'New Test' })).toHaveStyle({ background: 'var(--qms-brand)' })
    // ECG (pre-existing) stays unselected — only the newly created test was attached.
    expect(screen.getByRole('button', { name: 'ECG' })).not.toHaveStyle({ background: 'var(--qms-brand)' })
  })

  // P1 regression: a mismatched-therapy/campType test created via "Add test" must NEVER be
  // silently attached — it's invisible in the filtered list, so the user can't notice/remove it.
  it('does NOT auto-attach a newly created test whose therapy/campType do not match the project — refetches normally but leaves selection untouched', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    // Returns the mismatched test in the refetched list too (as if the search filter were ever
    // relaxed) — this is what actually exercises the frontend's own compatibility guard, not the filter.
    vi.mocked(testService.searchTests)
      .mockResolvedValueOnce(testsResponse([ecgTest]))
      .mockResolvedValue(testsResponse([ecgTest, stubMismatchedTest]))

    const user = userEvent.setup()
    await renderStep({ therapy: 'cardiology', type: ['screening'] }, true, true)

    await user.click(await screen.findByRole('button', { name: /add test/i }))
    await user.click(screen.getByRole('button', { name: /mismatched test created/i }))

    expect(screen.queryByText('New test modal stub')).not.toBeInTheDocument()
    const mismatchedChip = await screen.findByRole('button', { name: /oncology lab test/i })
    expect(mismatchedChip).not.toHaveStyle({ background: 'var(--qms-brand)' })
    // The pre-existing ECG selection state is untouched too.
    expect(screen.getByRole('button', { name: 'ECG' })).not.toHaveStyle({ background: 'var(--qms-brand)' })
  })
})
