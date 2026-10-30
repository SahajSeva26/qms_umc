import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DivisionEntity } from '@/types/crm.types'

vi.mock('@/features/crm/divisions/division.service', () => ({
  divisionService: {
    updateDivision: vi.fn(async () => ({ success: true, message: '', data: { id: 'div-1' } })),
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function divisionFixture(overrides: Partial<DivisionEntity> = {}): DivisionEntity {
  return {
    id: 'div-1',
    code: 'div-000001',
    name: 'Cardiology North',
    therapy: ['cardiology'],
    mrCount: 5,
    tenant: 't-1',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

async function renderModal(division: DivisionEntity, onClose = vi.fn()) {
  const EditDivisionModal = (await import('./EditDivisionModal')).default
  const queryClient = makeQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <EditDivisionModal division={division} onClose={onClose} />
    </QueryClientProvider>,
  )
}

describe('EditDivisionModal — partial update payload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saving without touching any field omits name/mrCount — never resends a stale snapshot to clobber a concurrent edit', async () => {
    const { divisionService } = await import('@/features/crm/divisions/division.service')
    const user = userEvent.setup()
    await renderModal(divisionFixture({ name: 'STALE-NAME', mrCount: 42 }))

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(divisionService.updateDivision).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload).not.toHaveProperty('name')
    expect(payload).not.toHaveProperty('mrCount')
  })

  it('editing name directly includes only name in the payload', async () => {
    const { divisionService } = await import('@/features/crm/divisions/division.service')
    const user = userEvent.setup()
    await renderModal(divisionFixture({ name: 'OLD-NAME' }))

    const nameInput = screen.getByDisplayValue('OLD-NAME')
    await user.clear(nameInput)
    await user.type(nameInput, 'NEW-NAME')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(divisionService.updateDivision).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload.name).toBe('NEW-NAME')
    expect(payload).not.toHaveProperty('mrCount')
  })

  it('editing mrCount directly includes only mrCount, leaving the untouched name out', async () => {
    const { divisionService } = await import('@/features/crm/divisions/division.service')
    const user = userEvent.setup()
    await renderModal(divisionFixture({ name: 'STALE-NAME', mrCount: 5 }))

    const mrCountInput = screen.getByDisplayValue('5')
    await user.clear(mrCountInput)
    await user.type(mrCountInput, '9')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(divisionService.updateDivision).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload.mrCount).toBe(9)
    expect(payload).not.toHaveProperty('name')
  })

  it('editing a field then reverting it to its exact original value omits it — dirty-gating compares final vs. original, not "was ever touched"', async () => {
    const { divisionService } = await import('@/features/crm/divisions/division.service')
    const user = userEvent.setup()
    await renderModal(divisionFixture({ name: 'ORIGINAL-NAME' }))

    const nameInput = screen.getByDisplayValue('ORIGINAL-NAME')
    await user.clear(nameInput)
    await user.type(nameInput, 'TEMP-NAME')
    await user.clear(nameInput)
    await user.type(nameInput, 'ORIGINAL-NAME')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(divisionService.updateDivision).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload).not.toHaveProperty('name')
  })

  it('reordering therapy chips back to the same set (add then remove) omits therapy from the payload', async () => {
    const { divisionService } = await import('@/features/crm/divisions/division.service')
    const user = userEvent.setup()
    await renderModal(divisionFixture({ therapy: ['cardiology'] }))

    await user.click(screen.getByRole('button', { name: /add a therapy area/i }))
    await user.click(await screen.findByText('Diabetes'))
    await user.click(screen.getByRole('button', { name: /remove diabetes/i }))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(divisionService.updateDivision).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload).not.toHaveProperty('therapy')
  })
})
