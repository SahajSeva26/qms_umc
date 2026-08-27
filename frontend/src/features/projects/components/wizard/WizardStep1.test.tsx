import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DEFAULT_WIZARD_FORM } from '@/features/projects/wizard.types'
import WizardStep1 from './WizardStep1'

vi.mock('@/features/tests/test.service', () => ({
  testService: { searchTests: vi.fn() },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderStep(form: typeof DEFAULT_WIZARD_FORM, setField = vi.fn()) {
  const client = makeQueryClient()
  render(
    <QueryClientProvider client={client}>
      <WizardStep1 form={form} setField={setField} />
    </QueryClientProvider>,
  )
  return { setField }
}

describe('WizardStep1 — therapy-filtered tests', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('does not query tests at all while no therapy is selected', async () => {
    const { testService } = await import('@/features/tests/test.service')

    await renderStep({ ...DEFAULT_WIZARD_FORM, therapy: '' })

    expect(screen.getByText(/select a therapy to see available tests/i)).toBeInTheDocument()
    expect(testService.searchTests).not.toHaveBeenCalled()
  })

  it('queries tests scoped to the selected therapy once one is picked', async () => {
    const { testService } = await import('@/features/tests/test.service')
    vi.mocked(testService.searchTests).mockResolvedValue({
      success: true,
      message: '',
      data: { items: [{ id: 't-1', code: 'ecg', name: 'ECG', therapy: 'cardiology', consumption: [] }], count: 1 },
    } as never)

    await renderStep({ ...DEFAULT_WIZARD_FORM, therapy: 'cardiology' })

    await waitFor(() => expect(testService.searchTests).toHaveBeenCalledWith(expect.objectContaining({ therapy: 'cardiology', status: 'active' })))
    expect(await screen.findByRole('button', { name: 'ECG' })).toBeInTheDocument()
  })

  it('sends real Test ids (not the old enum strings) when a chip is toggled', async () => {
    const { testService } = await import('@/features/tests/test.service')
    vi.mocked(testService.searchTests).mockResolvedValue({
      success: true,
      message: '',
      data: { items: [{ id: 't-1', code: 'ecg', name: 'ECG', therapy: 'cardiology', consumption: [] }], count: 1 },
    } as never)

    const user = userEvent.setup()
    const { setField } = await renderStep({ ...DEFAULT_WIZARD_FORM, therapy: 'cardiology' })

    await user.click(await screen.findByRole('button', { name: 'ECG' }))

    expect(setField).toHaveBeenCalledWith('tests', ['t-1'])
  })

  it('clears already-selected tests when therapy changes, in the same update', async () => {
    const { testService } = await import('@/features/tests/test.service')
    vi.mocked(testService.searchTests).mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } } as never)

    const user = userEvent.setup()
    const { setField } = await renderStep({ ...DEFAULT_WIZARD_FORM, therapy: 'cardiology', tests: ['old-cardio-test-id'] })

    await user.click(screen.getByRole('combobox', { name: '' }))
    const option = await screen.findByRole('option', { name: /pulmonology/i })
    await user.click(option)

    expect(setField).toHaveBeenCalledWith('therapy', 'pulmonology')
    expect(setField).toHaveBeenCalledWith('tests', [])
  })

  it('shows a retry-able error state, not a false "no tests configured" message, when the tests query fails', async () => {
    const { testService } = await import('@/features/tests/test.service')
    vi.mocked(testService.searchTests).mockRejectedValue(new Error('network error'))

    await renderStep({ ...DEFAULT_WIZARD_FORM, therapy: 'cardiology' })

    expect(await screen.findByText(/couldn.t load tests/i)).toBeInTheDocument()
    expect(screen.queryByText(/no tests configured/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('retries the tests query when Retry is clicked after a failure', async () => {
    const { testService } = await import('@/features/tests/test.service')
    vi.mocked(testService.searchTests)
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({
        success: true,
        message: '',
        data: { items: [{ id: 't-1', code: 'ecg', name: 'ECG', therapy: 'cardiology', consumption: [] }], count: 1 },
      } as never)

    const user = userEvent.setup()
    await renderStep({ ...DEFAULT_WIZARD_FORM, therapy: 'cardiology' })

    await user.click(await screen.findByRole('button', { name: /retry/i }))

    expect(await screen.findByRole('button', { name: 'ECG' })).toBeInTheDocument()
  })
})
