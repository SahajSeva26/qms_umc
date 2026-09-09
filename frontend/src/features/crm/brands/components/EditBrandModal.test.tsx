import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { BrandEntity } from '@/types/brand.types'

vi.mock('@/features/crm/brands/brand.service', () => ({
  brandService: {
    createBrand: vi.fn(async () => ({ success: true, message: '', data: { id: 'brand-1' } })),
    updateBrand: vi.fn(async () => ({ success: true, message: '', data: {} })),
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function brandFixture(overrides: Partial<BrandEntity> = {}): BrandEntity {
  return {
    id: 'brand-1',
    tenant: 't-1',
    division: 'div-1',
    name: 'Cardiostat',
    code: 'cardiostat',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

async function renderModal(props: Partial<{ brand: BrandEntity | null; canManage: boolean; onClose: () => void }> = {}) {
  const EditBrandModal = (await import('./EditBrandModal')).default
  const onClose = props.onClose ?? vi.fn()
  const queryClient = makeQueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <EditBrandModal
        open
        brand={props.brand ?? null}
        divisionId="div-1"
        canManage={props.canManage ?? true}
        onClose={onClose}
      />
    </QueryClientProvider>,
  )
  return { onClose }
}

describe('EditBrandModal — create mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('blocks creating with a blank name, never calls createBrand', async () => {
    const { brandService } = await import('@/features/crm/brands/brand.service')
    const user = userEvent.setup()
    await renderModal({ brand: null })

    await user.click(screen.getByRole('button', { name: /create brand/i }))

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument()
    expect(brandService.createBrand).not.toHaveBeenCalled()
  })

  it('creates a brand scoped to the given division', async () => {
    const { brandService } = await import('@/features/crm/brands/brand.service')
    const user = userEvent.setup()
    await renderModal({ brand: null })

    const nameInput = document.querySelector('input[type="text"]') as HTMLInputElement
    await user.type(nameInput, 'Cardiostat')
    await user.click(screen.getByRole('button', { name: /create brand/i }))

    await vi.waitFor(() => expect(brandService.createBrand).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(brandService.createBrand).mock.calls[0][0]
    expect(payload).toEqual({ division: 'div-1', name: 'Cardiostat' })
  })
})

describe('EditBrandModal — edit mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saving without touching any field omits name/status entirely — never resends a stale snapshot', async () => {
    const { brandService } = await import('@/features/crm/brands/brand.service')
    const user = userEvent.setup()
    await renderModal({ brand: brandFixture({ name: 'STALE-NAME', status: 'active' }) })

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(brandService.updateBrand).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload).not.toHaveProperty('name')
    expect(payload).not.toHaveProperty('status')
  })

  it('editing name directly includes only name in the payload', async () => {
    const { brandService } = await import('@/features/crm/brands/brand.service')
    const user = userEvent.setup()
    await renderModal({ brand: brandFixture({ name: 'OLD-NAME' }) })

    const nameInput = screen.getByDisplayValue('OLD-NAME')
    await user.clear(nameInput)
    await user.type(nameInput, 'NEW-NAME')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(brandService.updateBrand).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload.name).toBe('NEW-NAME')
    expect(payload).not.toHaveProperty('status')
  })

  it('editing a field then reverting it to its exact original value omits it from the payload', async () => {
    const { brandService } = await import('@/features/crm/brands/brand.service')
    const user = userEvent.setup()
    await renderModal({ brand: brandFixture({ name: 'ORIGINAL-NAME' }) })

    const nameInput = screen.getByDisplayValue('ORIGINAL-NAME')
    await user.clear(nameInput)
    await user.type(nameInput, 'TEMP-NAME')
    await user.clear(nameInput)
    await user.type(nameInput, 'ORIGINAL-NAME')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(brandService.updateBrand).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload).not.toHaveProperty('name')
  })

  it('a caller without manage permission cannot edit the name and has no Save button', async () => {
    await renderModal({ brand: brandFixture(), canManage: false })

    expect(screen.getByDisplayValue('Cardiostat')).toBeDisabled()
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument()
    expect(screen.getByText(/don't have permission/i)).toBeInTheDocument()
  })
})
