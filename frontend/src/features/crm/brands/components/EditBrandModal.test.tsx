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

  it('shows name as read-only text, not an editable input — renaming would desync the backend-derived code', async () => {
    await renderModal({ brand: brandFixture({ name: 'Cardiostat' }) })

    expect(screen.getByText('Cardiostat')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Cardiostat')).not.toBeInTheDocument()
    expect(document.querySelector('input[type="text"]')).not.toBeInTheDocument()
  })

  it('saving without touching status omits it entirely — never resends a stale snapshot', async () => {
    const { brandService } = await import('@/features/crm/brands/brand.service')
    const user = userEvent.setup()
    await renderModal({ brand: brandFixture({ status: 'active' }) })

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(brandService.updateBrand).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload).not.toHaveProperty('status')
  })

  it('changing status directly includes only status in the payload', async () => {
    const { brandService } = await import('@/features/crm/brands/brand.service')
    const user = userEvent.setup()
    await renderModal({ brand: brandFixture({ status: 'active' }) })

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByText('Inactive'))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(brandService.updateBrand).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload).toEqual({ status: 'inactive' })
  })

  it('changing status then reverting it to its exact original value omits it from the payload', async () => {
    const { brandService } = await import('@/features/crm/brands/brand.service')
    const user = userEvent.setup()
    await renderModal({ brand: brandFixture({ status: 'active' }) })

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByText('Inactive'))
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByText('Active'))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(brandService.updateBrand).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload).not.toHaveProperty('status')
  })

  it('a caller without manage permission has no Status control or Save button', async () => {
    await renderModal({ brand: brandFixture(), canManage: false })

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument()
    expect(screen.getByText(/don't have permission/i)).toBeInTheDocument()
  })
})
