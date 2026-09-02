import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TenantAsyncPicker from './TenantAsyncPicker'

const searchTenants = vi.fn<(query: unknown) => Promise<{ success: boolean; message: string; data: { items: unknown[]; count: number } }>>()

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: { searchTenants: (query: unknown) => searchTenants(query) },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

// A customer tenant (e.g. "Cipla") should be selectable; the platform's own
// tenant ("Qms", type: 'platform') never should be — this picker is scoped
// to real customer companies only.
describe('TenantAsyncPicker', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    searchTenants.mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })
  })

  it('does not fetch on open with an empty query, and shows a prompt to type instead', async () => {
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <TenantAsyncPicker value="" label="" onChange={vi.fn()} />
      </QueryClientProvider>,
    )

    await user.click(screen.getByPlaceholderText(/search company by name/i))

    expect(await screen.findByText(/type a company name to search/i)).toBeInTheDocument()
    expect(searchTenants).not.toHaveBeenCalled()
  })

  it('searches tenants scoped to type=customer, excluding the platform tenant', async () => {
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <TenantAsyncPicker value="" label="" onChange={vi.fn()} />
      </QueryClientProvider>,
    )

    await user.type(screen.getByPlaceholderText(/search company by name/i), 'Cipla')

    await vi.waitFor(() =>
      expect(searchTenants).toHaveBeenCalledWith(expect.objectContaining({ type: 'customer', name: 'Cipla' })),
    )
    expect(searchTenants).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'platform' }))
  })

  it('selecting a result calls onChange with the tenant id and label', async () => {
    searchTenants.mockResolvedValue({
      success: true,
      message: '',
      data: { count: 1, items: [{ id: 'tenant-cipla', name: 'Cipla', code: 'cipla' }] },
    })
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <TenantAsyncPicker value="" label="" onChange={onChange} />
      </QueryClientProvider>,
    )

    await user.type(screen.getByPlaceholderText(/search company by name/i), 'Cipla')
    const option = await screen.findByText('Cipla (cipla)')
    await user.click(option)

    expect(onChange).toHaveBeenCalledWith('tenant-cipla', 'Cipla (cipla)')
  })
})
