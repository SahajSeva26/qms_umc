import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import { toast } from '@/components/ui/sonner'
import CreateFoModal from './CreateFoModal'

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    createRole: vi.fn(async () => ({ success: true, message: '', data: { id: 'new-fo-role-id' } } as unknown)),
  },
}))

vi.mock('@/components/ui/sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

const createRole = vi.mocked(accessManagementService.createRole)

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderAndOpen(user: ReturnType<typeof userEvent.setup>) {
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <CreateFoModal tenantId="t-platform-1" foTypeId="rt-fo-1" />
    </QueryClientProvider>,
  )
  await user.click(screen.getByRole('button', { name: /add fo/i }))
}

// Fills step 0 (role details) and advances to step 1 (user account).
async function fillRoleDetailsAndAdvance(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^code$/i), 'fo-ravi-kumar')
  await user.type(screen.getByLabelText(/^name$/i), 'field-officer role for Ravi')
  await user.click(screen.getByRole('button', { name: /^next$/i }))
  await screen.findByText(/step 2 of 2/i)
}

async function fillUserAccount(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/first name/i), 'Ravi')
  await user.type(screen.getByLabelText(/^email$/i), 'ravi@example.com')
  await user.type(screen.getByLabelText(/^password$/i), 'Password123!')
  await user.type(screen.getByLabelText(/phone/i), '9999999999')
}

describe('CreateFoModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createRole.mockResolvedValue({ success: true, message: '', data: { id: 'new-fo-role-id' } } as unknown as Awaited<ReturnType<typeof accessManagementService.createRole>>)
  })

  it('opens on step 1 (role details) — no user-account or company/role-type/division/supervisor fields yet', async () => {
    const user = userEvent.setup()
    await renderAndOpen(user)

    expect(screen.getByText(/step 1 of 2/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^code$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()

    expect(screen.queryByLabelText(/first name/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/company/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^role type$/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/division/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/supervisor/i)).not.toBeInTheDocument()
  })

  it('blocks Next on step 1 with visible errors when code/name are blank', async () => {
    const user = userEvent.setup()
    await renderAndOpen(user)

    await user.click(screen.getByRole('button', { name: /^next$/i }))

    expect(await screen.findByText('Code is required')).toBeInTheDocument()
    expect(screen.getByText('Name is required')).toBeInTheDocument()
    expect(screen.getByText(/step 1 of 2/i)).toBeInTheDocument()
  })

  it('advances to step 2 (user account) once code/name are valid', async () => {
    const user = userEvent.setup()
    await renderAndOpen(user)

    await fillRoleDetailsAndAdvance(user)

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/^code$/i)).not.toBeInTheDocument()
  })

  it('Back returns to step 1 with the previously entered values intact', async () => {
    const user = userEvent.setup()
    await renderAndOpen(user)

    await fillRoleDetailsAndAdvance(user)
    await user.click(screen.getByRole('button', { name: /^back$/i }))

    expect(await screen.findByText(/step 1 of 2/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^code$/i)).toHaveValue('fo-ravi-kumar')
  })

  it('blocks Create on step 2 with visible errors when user fields are blank', async () => {
    const user = userEvent.setup()
    await renderAndOpen(user)

    await fillRoleDetailsAndAdvance(user)
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    expect(await screen.findByText("User's first name is required")).toBeInTheDocument()
    expect(createRole).not.toHaveBeenCalled()
  })

  it('submits with tenant/type equal to the tenantId/foTypeId props', async () => {
    const user = userEvent.setup()
    await renderAndOpen(user)

    await fillRoleDetailsAndAdvance(user)
    await fillUserAccount(user)
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => expect(createRole).toHaveBeenCalledTimes(1))
    expect(createRole).toHaveBeenCalledWith(expect.objectContaining({
      tenant: 't-platform-1',
      type: 'rt-fo-1',
      code: 'fo-ravi-kumar',
      permissions: [],
    }))
  })

  it('closes the dialog and shows a success toast after a successful create', async () => {
    const user = userEvent.setup()
    await renderAndOpen(user)

    await fillRoleDetailsAndAdvance(user)
    await fillUserAccount(user)
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => expect(screen.queryByText('Add field officer')).not.toBeInTheDocument())
    expect(toast.success).toHaveBeenCalledWith('Field officer added')
  })

  it('shows an error banner and stays open when the create mutation rejects', async () => {
    createRole.mockRejectedValueOnce(new Error('boom'))
    const user = userEvent.setup()
    await renderAndOpen(user)

    await fillRoleDetailsAndAdvance(user)
    await fillUserAccount(user)
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    expect(await screen.findByText(/failed to save changes/i)).toBeInTheDocument()
    expect(screen.getByText('Add field officer')).toBeInTheDocument()
    expect(toast.success).not.toHaveBeenCalled()
  })
})
