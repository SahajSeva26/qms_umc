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

async function renderStep(defaultValues: Partial<WizardFormState>, canBrowseTests = true) {
  await mockPermission(canBrowseTests)
  const client = makeQueryClient()
  const { rerender } = render(
    <QueryClientProvider client={client}>
      <WizardTestHarness formValues={defaultValues}>
        <WizardStep1 />
      </WizardTestHarness>
    </QueryClientProvider>,
  )
  // Lets a test simulate a form-state change (e.g. after a real project-type
  // change) by remounting a fresh harness instance with new defaultValues —
  // WizardStep1 itself has no props to vary, so this is the equivalent of the
  // old prop-drilled rerenderWithForm helper for this context-driven version.
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

    await renderStep({ therapy: '', type: ['screening_camp'] })

    expect(screen.getByText(/select a therapy to see available tests/i)).toBeInTheDocument()
    expect(testService.searchTests).not.toHaveBeenCalled()
  })

  it('does not query tests while a therapy is picked but no project type is selected yet', async () => {
    const { testService } = await import('@/features/test-master/test.service')

    await renderStep({ therapy: 'cardiology', type: [] })

    expect(screen.getByText(/select a project type to see available tests/i)).toBeInTheDocument()
    expect(testService.searchTests).not.toHaveBeenCalled()
  })

  it('queries only the camp type(s) derived from the selected project type — screening_camp scopes to campType=screening only', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.searchTests).mockResolvedValue(testsResponse([ecgTest]))

    await renderStep({ therapy: 'cardiology', type: ['screening_camp'] })

    await waitFor(() => expect(testService.searchTests).toHaveBeenCalledWith(expect.objectContaining({ therapy: 'cardiology', campType: 'screening', status: 'active' })))
    expect(testService.searchTests).not.toHaveBeenCalledWith(expect.objectContaining({ campType: 'diet' }))
    expect(testService.searchTests).not.toHaveBeenCalledWith(expect.objectContaining({ campType: 'lab' }))
    expect(await screen.findByRole('button', { name: 'ECG' })).toBeInTheDocument()
    expect(testService.searchTests).toHaveBeenCalledTimes(1)
  })

  it('queries every camp type when project type is "mixed" — mixed is a real, selectable type, not removed', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.searchTests).mockResolvedValue(testsResponse([]))

    await renderStep({ therapy: 'cardiology', type: ['mixed'] })

    await waitFor(() => {
      expect(testService.searchTests).toHaveBeenCalledWith(expect.objectContaining({ campType: 'screening' }))
      expect(testService.searchTests).toHaveBeenCalledWith(expect.objectContaining({ campType: 'diet' }))
      expect(testService.searchTests).toHaveBeenCalledWith(expect.objectContaining({ campType: 'lab' }))
    })
  })

  it('merges camp types across more than one selected project type (diet + lab_test → diet and lab, not screening)', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.searchTests).mockResolvedValue(testsResponse([]))

    await renderStep({ therapy: 'cardiology', type: ['diet', 'lab_test'] })

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
    await renderStep({ therapy: 'cardiology', type: ['screening_camp'] })

    const chip = await screen.findByRole('button', { name: 'ECG' })
    await user.click(chip)

    expect(chip).toHaveStyle({ background: 'var(--qms-brand)' })
  })

  it('clears already-selected tests when therapy changes, in the same update', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    // Static across calls (real filtering isn't modeled here) — resolving a
    // real test lets the chip itself be observed active, then inactive,
    // rather than asserting on a chip id string that's never a real label.
    vi.mocked(testService.searchTests).mockResolvedValue(testsResponse([ecgTest]))

    const user = userEvent.setup()
    await renderStep({ therapy: 'cardiology', type: ['screening_camp'], tests: [ecgTest.id] })

    const ecgChipBefore = await screen.findByRole('button', { name: 'ECG' })
    expect(ecgChipBefore).toHaveStyle({ background: 'var(--qms-brand)' })

    await user.click(screen.getByRole('combobox', { name: '' }))
    const option = await screen.findByRole('option', { name: /pulmonology/i })
    await user.click(option)

    // Therapy switched away from cardiology — tests[] must have been cleared
    // in the same update, not carried over stale. The mocked catalog is
    // static, so ECG re-renders from the same response; only its active
    // styling should change once the field is actually cleared.
    await waitFor(() => expect(testService.searchTests).toHaveBeenCalledWith(expect.objectContaining({ therapy: 'pulmonology' })))
    const ecgChipAfter = await screen.findByRole('button', { name: 'ECG' })
    expect(ecgChipAfter).not.toHaveStyle({ background: 'var(--qms-brand)' })
  })

  it('clears already-selected tests when project type changes — a test valid for the old type set may not be for the new one', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.searchTests).mockResolvedValue(testsResponse([ecgTest]))

    const user = userEvent.setup()
    await renderStep({ therapy: 'cardiology', type: ['screening_camp'], tests: [ecgTest.id] })

    const ecgChipBefore = await screen.findByRole('button', { name: 'ECG' })
    // Pre-existing selection (from defaultValues) shows as active before the type change.
    expect(ecgChipBefore).toHaveStyle({ background: 'var(--qms-brand)' })

    await user.click(screen.getByRole('button', { name: /^Diet$/i }))

    await waitFor(() => expect(testService.searchTests).toHaveBeenCalledWith(expect.objectContaining({ campType: 'diet' })))
    // The mocked catalog is static, so ECG re-renders from the same
    // response; only its active styling should change once tests[] is
    // actually cleared by the type change.
    const ecgChipAfter = await screen.findByRole('button', { name: 'ECG' })
    expect(ecgChipAfter).not.toHaveStyle({ background: 'var(--qms-brand)' })
  })

  it('shows a retry-able error state, not a false "no tests configured" message, when the tests query fails', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.searchTests).mockRejectedValue(new Error('network error'))

    await renderStep({ therapy: 'cardiology', type: ['screening_camp'] })

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
    await renderStep({ therapy: 'cardiology', type: ['screening_camp'] })

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

    await rerenderWithForm({ therapy: 'cardiology', type: ['screening_camp'] })

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
    await renderStep({ therapy: 'cardiology', type: ['screening_camp'] })

    expect(await screen.findByRole('button', { name: 'ECG 0' })).toBeInTheDocument()
    const loadMore = screen.getByRole('button', { name: /load more tests/i })
    await user.click(loadMore)

    expect(await screen.findByRole('button', { name: 'ECG 20' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ECG 0' })).toBeInTheDocument()
  })

  it('shows a permission message instead of querying the test catalog when the actor lacks test-master:search/manage', async () => {
    const { testService } = await import('@/features/test-master/test.service')

    await renderStep({ therapy: 'cardiology', type: ['screening_camp'] }, false)

    expect(await screen.findByText(/don't have permission to browse the test catalog/i)).toBeInTheDocument()
    expect(testService.searchTests).not.toHaveBeenCalled()
  })

  it('clears already-selected tests if canBrowseTests transitions to false while the wizard is open', async () => {
    const { testService } = await import('@/features/test-master/test.service')
    vi.mocked(testService.searchTests).mockResolvedValue(testsResponse([ecgTest]))

    const { rerenderWithForm } = await renderStep({ therapy: 'cardiology', type: ['screening_camp'], tests: ['t-1'] })
    const chip = await screen.findByRole('button', { name: 'ECG' })
    expect(chip).toHaveStyle({ background: 'var(--qms-brand)' })

    // Simulate a session refetch revoking the permission mid-wizard.
    await mockPermission(false)
    await rerenderWithForm({ therapy: 'cardiology', type: ['screening_camp'], tests: ['t-1'] })

    expect(await screen.findByText(/don't have permission to browse the test catalog/i)).toBeInTheDocument()
  })
})
