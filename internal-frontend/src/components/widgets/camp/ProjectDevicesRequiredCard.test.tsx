import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import ProjectDevicesRequiredCard from './ProjectDevicesRequiredCard'
import { testService } from '@/features/test-master/test.service'
import type { TestEntity } from '@/features/test-master/testMaster.types'

vi.mock('@/features/test-master/test.service', () => ({
  testService: { getTest: vi.fn() },
}))

function testFixture(overrides: Partial<TestEntity> = {}): TestEntity {
  return {
    id: 't-1', code: 'tst-000001', name: 'Demo HbA1c', duration: 10, price: 300,
    consumption: [], ...overrides,
  } as TestEntity
}

function renderCard(testIds: string[]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ProjectDevicesRequiredCard testIds={testIds} />
    </QueryClientProvider>,
  )
}

describe('ProjectDevicesRequiredCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when the project has no tests at all', () => {
    const { container } = renderCard([])
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the real device names derived from the tests\' consumption, deduped and sorted', async () => {
    vi.mocked(testService.getTest).mockImplementation(async (id: string) => ({
      success: true, message: '',
      data: testFixture({
        id,
        consumption: id === 't-1'
          ? [
              { item: { id: 'dev-a1c', name: 'GlycoCheck A1C Analyser', type: 'device' }, rate: 0 },
              { item: { id: 'con-1', name: 'A1C test cartridge', type: 'consumable' }, rate: 1 },
            ]
          : [
              // Same device id shared by a second test — must not render twice.
              { item: { id: 'dev-a1c', name: 'GlycoCheck A1C Analyser', type: 'device' }, rate: 0 },
              { item: { id: 'dev-bp', name: 'CardioSure BP Monitor', type: 'device' }, rate: 0 },
            ],
      }),
    }))

    renderCard(['t-1', 't-2'])

    await waitFor(() => expect(screen.getByText('CardioSure BP Monitor')).toBeInTheDocument())
    expect(screen.getByText('GlycoCheck A1C Analyser')).toBeInTheDocument()
    // Consumables are never shown here — only devices.
    expect(screen.queryByText('A1C test cartridge')).not.toBeInTheDocument()
    // Deduped — only one chip per device even though both tests reference it.
    expect(screen.getAllByText('GlycoCheck A1C Analyser')).toHaveLength(1)
  })

  it('renders nothing when none of the project\'s tests require any device', async () => {
    vi.mocked(testService.getTest).mockResolvedValue({
      success: true, message: '',
      data: testFixture({ consumption: [{ item: { id: 'con-1', name: 'A1C test cartridge', type: 'consumable' }, rate: 1 }] }),
    })

    renderCard(['t-1'])

    await waitFor(() => expect(testService.getTest).toHaveBeenCalled())
    expect(screen.queryByText(/devices required/i)).not.toBeInTheDocument()
  })

  it('renders nothing while the fetch is still loading or has failed', async () => {
    vi.mocked(testService.getTest).mockRejectedValue(new Error('network error'))
    const { container } = renderCard(['t-1'])

    await waitFor(() => expect(testService.getTest).toHaveBeenCalled())
    expect(container.textContent).not.toContain('Devices required')
  })
})
