import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { TestEntity } from '@/types/test.types'

vi.mock('@/features/tests/test.service', () => ({
  testService: { searchTests: vi.fn(), getTest: vi.fn(), createTest: vi.fn(), updateTest: vi.fn() },
}))
vi.mock('@/features/inventory/real/inventoryMaster.service', () => ({
  inventoryMasterService: { searchInventoryMasters: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })) },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderForm(test: TestEntity | null, onClose = vi.fn()) {
  const TestForm = (await import('./TestForm')).default
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <TestForm test={test} onClose={onClose} />
    </QueryClientProvider>,
  )
  return { onClose }
}

const baseTest: TestEntity = {
  id: 't-1',
  code: 'ecg',
  name: 'ECG',
  description: 'Electrocardiogram screening',
  therapy: 'cardiology',
  status: 'active',
  consumption: [{ item: 'd-1', rate: 0 }, { item: 'd-2', rate: 0 }, { item: 'c-1', rate: 1 }],
}

describe('TestForm — create mode', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('validates code/name/therapy/status and submits a create payload with an empty consumption array when nothing is picked', async () => {
    const { testService } = await import('@/features/tests/test.service')
    vi.mocked(testService.createTest).mockResolvedValue({ success: true, message: '', data: baseTest } as never)

    const user = userEvent.setup()
    const { onClose } = await renderForm(null)

    await user.type(screen.getByLabelText(/code/i), 'ECG')
    await user.type(screen.getByLabelText(/^name/i), 'ECG Test')
    await user.click(screen.getByLabelText(/therapy/i))
    await user.click(await screen.findByRole('option', { name: /cardiology/i }))
    await user.click(screen.getByRole('button', { name: /create test/i }))

    await waitFor(() => expect(testService.createTest).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(testService.createTest).mock.calls[0][0]
    expect(payload.code).toBe('ecg')
    expect(payload.therapy).toBe('cardiology')
    expect(payload.status).toBe('active')
    expect(payload.consumption).toEqual([])
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('blocks submission until a therapy is consciously chosen — no first-enum-value default', async () => {
    const { testService } = await import('@/features/tests/test.service')
    const user = userEvent.setup()
    await renderForm(null)

    await user.type(screen.getByLabelText(/code/i), 'ECG')
    await user.type(screen.getByLabelText(/^name/i), 'ECG Test')
    await user.click(screen.getByRole('button', { name: /create test/i }))

    expect(testService.createTest).not.toHaveBeenCalled()
    expect(screen.getByText(/select therapy/i)).toBeInTheDocument()
  })

  it('renders real, editable device/consumable pickers', async () => {
    await renderForm(null)

    expect(screen.getByText(/devices required/i)).toBeInTheDocument()
    expect(screen.getByText(/consumables required/i)).toBeInTheDocument()
    expect(screen.getAllByPlaceholderText(/search devices/i)).toHaveLength(2)
  })

  it('merges picked devices and consumables into one consumption array — device lines omit rate, consumable lines send rate:1', async () => {
    const { testService } = await import('@/features/tests/test.service')
    const { inventoryMasterService } = await import('@/features/inventory/real/inventoryMaster.service')
    vi.mocked(testService.createTest).mockResolvedValue({ success: true, message: '', data: baseTest } as never)
    vi.mocked(inventoryMasterService.searchInventoryMasters).mockImplementation(async (query: { type?: string }) => {
      if (query.type === 'device') {
        return {
          success: true,
          message: '',
          data: { items: [{ id: 'glucometer-1', code: 'DEV-01', name: 'Glucometer', type: 'device', sku: 'sku', unit: 'ea' }], count: 1 },
        } as never
      }
      return {
        success: true,
        message: '',
        data: { items: [{ id: 'gloves-1', code: 'CON-01', name: 'Gloves', type: 'consumable', sku: 'sku', unit: 'pair' }], count: 1 },
      } as never
    })

    const user = userEvent.setup()
    await renderForm(null)

    await user.type(screen.getByLabelText(/code/i), 'ECG')
    await user.type(screen.getByLabelText(/^name/i), 'ECG Test')
    await user.click(screen.getByLabelText(/therapy/i))
    await user.click(await screen.findByRole('option', { name: /cardiology/i }))

    const [deviceSearch, consumableSearch] = screen.getAllByPlaceholderText(/search devices/i)
    await user.type(deviceSearch, 'Gluco')
    await user.click(await screen.findByText(/Glucometer \(DEV-01\)/i))
    await user.type(consumableSearch, 'Glove')
    await user.click(await screen.findByText(/Gloves \(CON-01\)/i))

    await user.click(screen.getByRole('button', { name: /create test/i }))

    await waitFor(() => expect(testService.createTest).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(testService.createTest).mock.calls[0][0]
    expect(payload.consumption).toEqual([{ item: 'glucometer-1' }, { item: 'gloves-1', rate: 1 }])
  })

  it('includes the chosen status (Inactive) in the create payload, not an omitted/defaulted field', async () => {
    const { testService } = await import('@/features/tests/test.service')
    vi.mocked(testService.createTest).mockResolvedValue({ success: true, message: '', data: baseTest } as never)

    const user = userEvent.setup()
    await renderForm(null)

    await user.type(screen.getByLabelText(/code/i), 'ECG')
    await user.type(screen.getByLabelText(/^name/i), 'ECG Test')
    await user.click(screen.getByLabelText(/therapy/i))
    await user.click(await screen.findByRole('option', { name: /cardiology/i }))

    await user.click(screen.getByLabelText(/status/i))
    await user.click(await screen.findByRole('option', { name: /inactive/i }))

    await user.click(screen.getByRole('button', { name: /create test/i }))

    await waitFor(() => expect(testService.createTest).toHaveBeenCalledTimes(1))
    expect(vi.mocked(testService.createTest).mock.calls[0][0].status).toBe('inactive')
  })
})

describe('TestForm — edit mode', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('disables code and therapy, and shows a single merged resource count, not a picker or per-item labels', async () => {
    await renderForm(baseTest)

    expect(screen.getByLabelText(/code/i)).toBeDisabled()
    expect(screen.getByLabelText(/therapy/i)).toBeDisabled()
    expect(screen.getByText(/3 resources/i)).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/search devices/i)).not.toBeInTheDocument()
    expect(screen.queryByText('d-1')).not.toBeInTheDocument()
  })

  it('constructs an update payload with no code/therapy/consumption keys', async () => {
    const { testService } = await import('@/features/tests/test.service')
    vi.mocked(testService.updateTest).mockResolvedValue({ success: true, message: '', data: baseTest } as never)

    const user = userEvent.setup()
    await renderForm(baseTest)

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(testService.updateTest).toHaveBeenCalledTimes(1))
    const [, payload] = vi.mocked(testService.updateTest).mock.calls[0]
    expect(payload).not.toHaveProperty('consumption')
    expect(payload).not.toHaveProperty('code')
    expect(payload).not.toHaveProperty('therapy')
  })

  it('blocks blanking a previously-set description, and does not submit', async () => {
    const { testService } = await import('@/features/tests/test.service')
    const user = userEvent.setup()
    await renderForm(baseTest)

    const description = screen.getByLabelText(/description/i)
    await user.clear(description)
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText(/clearing a description isn.t supported yet/i)).toBeInTheDocument()
    expect(testService.updateTest).not.toHaveBeenCalled()
  })

  it('allows submitting a test that already had no description, still blank, and omits the key entirely', async () => {
    const { testService } = await import('@/features/tests/test.service')
    vi.mocked(testService.updateTest).mockResolvedValue({ success: true, message: '', data: baseTest } as never)
    const noDescriptionTest = { ...baseTest, description: undefined }

    const user = userEvent.setup()
    await renderForm(noDescriptionTest)

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(testService.updateTest).toHaveBeenCalledTimes(1))
    expect(screen.queryByText(/clearing a description isn.t supported yet/i)).not.toBeInTheDocument()
    const [, payload] = vi.mocked(testService.updateTest).mock.calls[0]
    expect(payload).not.toHaveProperty('description')
  })
})

describe('TestForm — remount on switch', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows the newly-passed test\'s values, not stale defaults, when remounted with a new key', async () => {
    const testB: TestEntity = { ...baseTest, id: 't-2', code: 'bp', name: 'Blood Pressure', description: 'BP check' }
    const TestForm = (await import('./TestForm')).default
    const client = makeQueryClient()

    const { rerender } = render(
      <QueryClientProvider client={client}>
        <TestForm key="t-1" test={baseTest} onClose={vi.fn()} />
      </QueryClientProvider>,
    )
    expect(screen.getByDisplayValue('ECG')).toBeInTheDocument()

    rerender(
      <QueryClientProvider client={client}>
        <TestForm key="t-2" test={testB} onClose={vi.fn()} />
      </QueryClientProvider>,
    )

    expect(screen.getByDisplayValue('Blood Pressure')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('ECG')).not.toBeInTheDocument()
  })
})
