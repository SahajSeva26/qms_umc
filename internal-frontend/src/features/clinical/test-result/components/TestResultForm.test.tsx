import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { TestEntity } from '@/features/test-master/testMaster.types'

vi.mock('@/features/clinical/test-result/testResult.service', () => ({
  testResultService: { searchTestResults: vi.fn(), getTestResult: vi.fn(), createTestResult: vi.fn(), updateTestResult: vi.fn() },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function testMasterFixture(overrides: Partial<TestEntity> = {}): TestEntity {
  return {
    id: 'tm-1',
    code: 'tst-000001',
    name: 'Blood Sugar Test',
    therapy: 'diabetes',
    campType: 'screening',
    duration: 10,
    price: 100,
    consumption: [],
    config: { inputs: [{ label: 'Blood Sugar Level', type: 'number', unit: 'mg/dL' }] },
    ...overrides,
  } as TestEntity
}

async function renderForm(testMaster: TestEntity) {
  const TestResultForm = (await import('./TestResultForm')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <TestResultForm screeningId="scr-1" testMaster={testMaster} />
    </QueryClientProvider>,
  )
}

describe('TestResultForm', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('submits the exact payload for a numeric field with a real unit', async () => {
    const { testResultService } = await import('@/features/clinical/test-result/testResult.service')
    vi.mocked(testResultService.createTestResult).mockResolvedValue({
      success: true,
      message: '',
      data: { id: 'res-1', tenant: null, screening: null, type: null, performedBy: null, result: { key: 'Blood Sugar Level', value: '142', unit: 'mg/dL' }, createdAt: '', updatedAt: '' },
    })

    const user = userEvent.setup()
    await renderForm(testMasterFixture())

    await user.type(screen.getByRole('spinbutton'), '142')
    await user.click(screen.getByRole('button', { name: /record result/i }))

    expect(testResultService.createTestResult).toHaveBeenCalledTimes(1)
    expect(testResultService.createTestResult).toHaveBeenCalledWith({
      screening: 'scr-1',
      type: 'tm-1',
      result: { key: 'Blood Sugar Level', value: '142', unit: 'mg/dL' },
    })
  })

  it('submits the chosen interpretation alongside the result when one is picked', async () => {
    const { testResultService } = await import('@/features/clinical/test-result/testResult.service')
    vi.mocked(testResultService.createTestResult).mockResolvedValue({ success: true, message: '', data: null } as never)

    const user = userEvent.setup()
    await renderForm(testMasterFixture())

    await user.type(screen.getByRole('spinbutton'), '250')
    await user.click(screen.getByLabelText(/interpretation/i))
    await user.click(await screen.findByRole('option', { name: /^HIGH$/i }))
    await user.click(screen.getByRole('button', { name: /record result/i }))

    expect(testResultService.createTestResult).toHaveBeenCalledWith({
      screening: 'scr-1',
      type: 'tm-1',
      result: { key: 'Blood Sugar Level', value: '250', unit: 'mg/dL', interpretation: 'HIGH' },
    })
  })

  it('submits a "N/A" unit (never a blank string) for a Boolean field, since the backend rejects an empty unit', async () => {
    const { testResultService } = await import('@/features/clinical/test-result/testResult.service')
    vi.mocked(testResultService.createTestResult).mockResolvedValue({ success: true, message: '', data: null } as never)

    const user = userEvent.setup()
    await renderForm(testMasterFixture({ config: { inputs: [{ label: 'Pregnant', type: 'boolean' }] } }))

    await user.click(screen.getByLabelText('Pregnant'))
    await user.click(await screen.findByRole('option', { name: /^Yes$/i }))
    await user.click(screen.getByRole('button', { name: /record result/i }))

    expect(testResultService.createTestResult).toHaveBeenCalledWith({
      screening: 'scr-1',
      type: 'tm-1',
      result: { key: 'Pregnant', value: 'true', unit: 'N/A' },
    })
  })

  it('submits the picked option value (not its label) for a select field', async () => {
    const { testResultService } = await import('@/features/clinical/test-result/testResult.service')
    vi.mocked(testResultService.createTestResult).mockResolvedValue({ success: true, message: '', data: null } as never)

    const user = userEvent.setup()
    await renderForm(
      testMasterFixture({
        config: { inputs: [{ label: 'Malaria Test', type: 'select', options: [{ label: 'Positive', value: 'positive' }, { label: 'Negative', value: 'negative' }] }] },
      }),
    )

    await user.click(screen.getByLabelText('Malaria Test'))
    await user.click(await screen.findByRole('option', { name: /^Positive$/i }))
    await user.click(screen.getByRole('button', { name: /record result/i }))

    expect(testResultService.createTestResult).toHaveBeenCalledWith({
      screening: 'scr-1',
      type: 'tm-1',
      result: { key: 'Malaria Test', value: 'positive', unit: 'N/A' },
    })
  })

  it('disables submission until a value is entered, and never calls createTestResult for a blank value', async () => {
    await renderForm(testMasterFixture())

    expect(screen.getByRole('button', { name: /record result/i })).toBeDisabled()
  })
})
