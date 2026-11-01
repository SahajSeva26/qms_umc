import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { bulkCreateTenants } = vi.hoisted(() => ({ bulkCreateTenants: vi.fn() }))

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: { bulkCreateTenants },
}))

function renderDialog() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ImportTenantsDialog />
    </QueryClientProvider>,
  )
}

import ImportTenantsDialog from './ImportTenantsDialog'

describe('ImportTenantsDialog', () => {
  beforeEach(() => vi.resetAllMocks())

  it('uploads the selected CSV and reports clean success', async () => {
    bulkCreateTenants.mockResolvedValue({ totalRows: 2, created: 2, failed: 0, errors: [] })
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole('button', { name: /import clients/i }))
    const file = new File(['name,ownerFirstName'], 'clients.csv', { type: 'text/csv' })
    await user.upload(screen.getByLabelText(/client csv file/i), file)
    await user.click(screen.getByRole('button', { name: /^import clients$/i }))

    await waitFor(() => expect(bulkCreateTenants).toHaveBeenCalledWith(file))
    expect(await screen.findByText('2 of 2 clients imported')).toBeInTheDocument()
  })

  it('shows partial row errors and warns against re-uploading successful rows', async () => {
    bulkCreateTenants.mockResolvedValue({
      totalRows: 3,
      created: 2,
      failed: 1,
      errors: [{ row: 3, error: { ownerEmail: 'Email already exists' } }],
    })
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole('button', { name: /import clients/i }))
    await user.upload(screen.getByLabelText(/client csv file/i), new File(['x'], 'clients.csv', { type: 'text/csv' }))
    await user.click(screen.getByRole('button', { name: /^import clients$/i }))

    expect(await screen.findByText('2 of 3 clients imported')).toBeInTheDocument()
    expect(screen.getByText(/successful rows are already created/i)).toBeInTheDocument()
    expect(screen.getByText('Row 3: ownerEmail: Email already exists')).toBeInTheDocument()
  })
})
