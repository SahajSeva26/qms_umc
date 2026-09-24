import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// File-local, not global — these multi-step tests exceeded the default 5s under CPU contention
// even with userEvent's { delay: null } applied below.
vi.setConfig({ testTimeout: 15_000 })

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('@/lib/file/file.service', () => ({
  fileService: {
    createFiles: vi.fn(),
    linkFileToEntity: vi.fn(),
    changeFileStatus: vi.fn(),
    bulkActivateFiles: vi.fn(),
    getFile: vi.fn(),
    searchFiles: vi.fn(),
  },
}))

vi.mock('@/lib/file/file.upload', () => ({
  uploadFileToS3: vi.fn(),
}))

// LocationPicker needs real Google Maps credentials, unavailable in tests —
// mock it to a button using the same onChange(LocationValue) contract a real pin-drop would use.
vi.mock('@/components/widgets/location-picker/LocationPicker', () => ({
  default: ({ value, onChange, onResolutionStateChange }: {
    value: unknown
    onChange: (v: unknown) => void
    onResolutionStateChange?: (status: 'idle' | 'loading' | 'error') => void
  }) => (
    <>
      <button
        type="button"
        onClick={() => onChange({ ...(value as object ?? {}), coordinates: [73.8567, 18.5204] })}
      >
        Set test coordinates
      </button>
      {/* Simulates the real widget's "pin moved, reverse-geocode still resolving" window. */}
      <button type="button" onClick={() => onResolutionStateChange?.('loading')}>
        Simulate location resolving
      </button>
      <button type="button" onClick={() => onResolutionStateChange?.('idle')}>
        Simulate location resolved
      </button>
    </>
  ),
}))

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    searchTenants: vi.fn(async () => ({ success: true, message: '', data: { items: [{ id: 't-platform', name: 'QMS Platform', code: 'qms-platform', type: 'platform', address: null }], count: 1 } })),
    searchRoleTypes: vi.fn(async () => ({ success: true, message: '', data: { items: [{ id: 'rt-sales-rep', code: 'sales-rep' }], count: 1 } })),
    searchRoles: vi.fn(async () => ({ success: true, message: '', data: { items: [{ id: 'role-sales-rep-1', code: 'sr-001', name: 'Sales Rep One' }], count: 1 } })),
    createTenant: vi.fn(async () => ({ success: true, message: '', data: { id: 'new-tenant-id' } })),
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderDialog() {
  const CreateTenantDialog = (await import('./CreateTenantDialog')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter>
        <CreateTenantDialog />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// Advances from step 0 (company basics) to step 1 (location) only.
async function fillStep0AndAdvance(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/code \*/i), 'acme-pharma')
  await user.type(screen.getByLabelText(/^name \*$/i), 'Acme Pharma')
  await user.click(screen.getByRole('combobox', { name: /sales rep/i }))
  const option = await screen.findByText(/sales rep one/i)
  await user.click(option)
  await user.click(screen.getByRole('button', { name: /^next$/i }))
}

describe('CreateTenantDialog — address', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('creates a company with NO address at all — address is optional end-to-end', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const user = userEvent.setup({ delay: null })
    await renderDialog()

    await user.click(screen.getByRole('button', { name: /new client/i }))
    await fillStep0AndAdvance(user)
    // Step 1 (location) — leave the address blank, advance to step 2.
    await user.click(screen.getByRole('button', { name: /^next$/i }))

    await user.type(screen.getByLabelText(/first name \*/i), 'Jane')
    await user.type(screen.getByLabelText(/^email \*$/i), 'jane@example.com')
    await user.type(screen.getByLabelText(/^password \*$/i), 'password123')

    await user.click(screen.getByRole('button', { name: /create company/i }))

    await waitFor(() => expect(accessManagementService.createTenant).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(accessManagementService.createTenant).mock.calls[0][0]
    expect(payload.address).toBeUndefined()
  })

  it('creates a company WITH an address when the user fills one in on step 1', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const user = userEvent.setup({ delay: null })
    await renderDialog()

    await user.click(screen.getByRole('button', { name: /new client/i }))
    await fillStep0AndAdvance(user)

    // Step 1 — location.
    await user.type(screen.getByLabelText(/^address line 1$/i), '221 Baker Street')
    await user.type(screen.getByLabelText(/^city$/i), 'Pune')
    await user.type(screen.getByLabelText(/^state$/i), 'Maharashtra')
    await user.type(screen.getByLabelText(/^pincode$/i), '411001')
    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await user.click(screen.getByRole('button', { name: /^next$/i }))

    // Step 2 — owner account.
    await user.type(screen.getByLabelText(/first name \*/i), 'Jane')
    await user.type(screen.getByLabelText(/^email \*$/i), 'jane@example.com')
    await user.type(screen.getByLabelText(/^password \*$/i), 'password123')

    await user.click(screen.getByRole('button', { name: /create company/i }))

    await waitFor(() => expect(accessManagementService.createTenant).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(accessManagementService.createTenant).mock.calls[0][0]
    expect(payload.address).toEqual(expect.objectContaining({
      addressLine1: '221 Baker Street', city: 'Pune', state: 'Maharashtra',
      pincode: '411001', coordinates: [73.8567, 18.5204],
    }))
  })

  it('advancing from step 1 to step 2 does not require an address to be filled in', async () => {
    const user = userEvent.setup({ delay: null })
    await renderDialog()

    await user.click(screen.getByRole('button', { name: /new client/i }))
    await fillStep0AndAdvance(user)
    // Step 1 (location) — leave the address blank, advance to step 2.
    await user.click(screen.getByRole('button', { name: /^next$/i }))

    // Reaching step 2's owner fields proves the address-less advance succeeded.
    expect(await screen.findByLabelText(/first name \*/i)).toBeInTheDocument()
  })

  it('a PARTIAL address (only City typed) blocks advancing from step 1 to step 2, with the error visible on step 1 — not a silently stuck submit on step 2', async () => {
    const user = userEvent.setup({ delay: null })
    await renderDialog()

    await user.click(screen.getByRole('button', { name: /new client/i }))
    await fillStep0AndAdvance(user)

    // Step 1 — only City typed, still an individually-invalid LocationValue.
    await user.type(screen.getByLabelText(/^city$/i), 'Pune')
    await user.click(screen.getByRole('button', { name: /^next$/i }))

    // Must stay on step 1 — the owner-account fields (step 2) must never appear.
    expect(screen.queryByLabelText(/first name \*/i)).not.toBeInTheDocument()
    // Each field renders its own FieldErrorText line — assert individually, not one OR-regex.
    expect(await screen.findByText('Address is required.')).toBeInTheDocument()
    expect(screen.getByText('State is required.')).toBeInTheDocument()
    expect(screen.getByText('Pincode is required.')).toBeInTheDocument()
    expect(screen.queryByText('City is required.')).not.toBeInTheDocument()
  })

  async function fillStep1WithAddress(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/^address line 1$/i), '221 Baker Street')
    await user.type(screen.getByLabelText(/^city$/i), 'Pune')
    await user.type(screen.getByLabelText(/^state$/i), 'Maharashtra')
    await user.type(screen.getByLabelText(/^pincode$/i), '411001')
  }

  it('disables step 1\'s Next (relabeled "Resolving location…") while the picked pin is still resolving, so it never advances to step 2', async () => {
    const user = userEvent.setup({ delay: null })
    await renderDialog()

    await user.click(screen.getByRole('button', { name: /new client/i }))
    await fillStep0AndAdvance(user)

    // Step 1 — location, still resolving.
    await fillStep1WithAddress(user)
    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await user.click(screen.getByRole('button', { name: /simulate location resolving/i }))

    const nextButton = await screen.findByRole('button', { name: /resolving location/i })
    expect(nextButton).toBeDisabled()
    await user.click(nextButton)
    // Never advanced past step 1 — owner-account fields must not appear.
    expect(screen.queryByLabelText(/first name \*/i)).not.toBeInTheDocument()
  })

  it('allows advancing to step 2 and creating once resolution returns to idle after a loading state', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const user = userEvent.setup({ delay: null })
    await renderDialog()

    await user.click(screen.getByRole('button', { name: /new client/i }))
    await fillStep0AndAdvance(user)

    // Step 1 — location, resolve then settle.
    await fillStep1WithAddress(user)
    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await user.click(screen.getByRole('button', { name: /simulate location resolving/i }))
    await user.click(screen.getByRole('button', { name: /simulate location resolved/i }))
    await user.click(screen.getByRole('button', { name: /^next$/i }))

    // Step 2 — owner account.
    await user.type(screen.getByLabelText(/first name \*/i), 'Jane')
    await user.type(screen.getByLabelText(/^email \*$/i), 'jane@example.com')
    await user.type(screen.getByLabelText(/^password \*$/i), 'password123')
    await user.click(screen.getByRole('button', { name: /create company/i }))

    await waitFor(() => expect(accessManagementService.createTenant).toHaveBeenCalledTimes(1))
  })

  it('Back from step 1 returns to step 0, and Back from step 2 returns to step 1', async () => {
    const user = userEvent.setup({ delay: null })
    await renderDialog()

    await user.click(screen.getByRole('button', { name: /new client/i }))
    await fillStep0AndAdvance(user)
    // On step 1 now.
    expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^back$/i }))
    // Back on step 0 — code/name fields visible again, values preserved from before.
    expect(screen.getByLabelText(/code \*/i)).toHaveValue('acme-pharma')

    // Advance forward again through both steps — values are already filled, just re-click Next twice.
    await user.click(screen.getByRole('button', { name: /^next$/i }))
    await user.click(screen.getByRole('button', { name: /^next$/i }))
    // On step 2 now.
    expect(screen.getByText(/step 3 of 3/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^back$/i }))
    // Back on step 1 — address field visible again, owner fields gone.
    expect(screen.getByLabelText(/^address line 1$/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/first name \*/i)).not.toBeInTheDocument()
  })
})

function makeFile(name = 'logo.png', type = 'image/png', size = 1024) {
  return new File(['x'.repeat(size)], name, { type })
}

async function fillStep0Simple(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/code \*/i), 'acme-pharma')
  await user.type(screen.getByLabelText(/^name \*$/i), 'Acme Pharma')
  await user.click(screen.getByRole('combobox', { name: /sales rep/i }))
  await user.click(await screen.findByText(/sales rep one/i))
}

// Step 1 (location) — leaves the address blank and advances to step 2.
async function skipLocationStep(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /^next$/i }))
}

async function fillStep1AndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/first name \*/i), 'Jane')
  await user.type(screen.getByLabelText(/^email \*$/i), 'jane@example.com')
  await user.type(screen.getByLabelText(/^password \*$/i), 'password123')
  await user.click(screen.getByRole('button', { name: /create company/i }))
}

describe('CreateTenantDialog — logo', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-preview-url')
    window.URL.revokeObjectURL = vi.fn()
  })

  it('picking an invalid file type shows inline validation error, no network call', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.searchTenants).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 't-platform', name: 'QMS Platform', code: 'qms-platform', type: 'platform', address: null }], count: 1 } } as never)
    vi.mocked(accessManagementService.searchRoleTypes).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 'rt-sales-rep', code: 'sales-rep' }], count: 1 } } as never)
    vi.mocked(accessManagementService.searchRoles).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 'role-sales-rep-1', code: 'sr-001', name: 'Sales Rep One' }], count: 1 } } as never)

    const user = userEvent.setup({ delay: null })
    await renderDialog()
    await user.click(screen.getByRole('button', { name: /new client/i }))

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const badFile = makeFile('doc.pdf', 'application/pdf')
    const pickerUser = userEvent.setup({ applyAccept: false, delay: null })
    await pickerUser.upload(input, badFile)

    expect(screen.getByText(/png, jpeg, or webp/i)).toBeInTheDocument()
    const { fileService } = await import('@/lib/file/file.service')
    expect(fileService.createFiles).not.toHaveBeenCalled()
  })

  it('submitting with NO logo picked behaves exactly as before — no useReplaceTenantLogo activity', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.searchTenants).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 't-platform', name: 'QMS Platform', code: 'qms-platform', type: 'platform', address: null }], count: 1 } } as never)
    vi.mocked(accessManagementService.searchRoleTypes).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 'rt-sales-rep', code: 'sales-rep' }], count: 1 } } as never)
    vi.mocked(accessManagementService.searchRoles).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 'role-sales-rep-1', code: 'sr-001', name: 'Sales Rep One' }], count: 1 } } as never)
    vi.mocked(accessManagementService.createTenant).mockResolvedValue({ success: true, message: '', data: { id: 'new-tenant-id' } } as never)

    const user = userEvent.setup({ delay: null })
    await renderDialog()
    await user.click(screen.getByRole('button', { name: /new client/i }))
    await fillStep0Simple(user)
    await skipLocationStep(user)
    await user.click(screen.getByRole('button', { name: /^next$/i }))
    await fillStep1AndSubmit(user)

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/admin/tenants/new-tenant-id'))
    const { fileService } = await import('@/lib/file/file.service')
    expect(fileService.createFiles).not.toHaveBeenCalled()
  })

  it('submitting WITH a logo picked: replace() is called with the REAL tenant id, not empty/stale (stale-closure regression)', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.searchTenants).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 't-platform', name: 'QMS Platform', code: 'qms-platform', type: 'platform', address: null }], count: 1 } } as never)
    vi.mocked(accessManagementService.searchRoleTypes).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 'rt-sales-rep', code: 'sales-rep' }], count: 1 } } as never)
    vi.mocked(accessManagementService.searchRoles).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 'role-sales-rep-1', code: 'sr-001', name: 'Sales Rep One' }], count: 1 } } as never)
    vi.mocked(accessManagementService.createTenant).mockResolvedValue({ success: true, message: '', data: { id: 'new-tenant-id' } } as never)

    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [{ id: 'new-file', uploadUrl: 'https://s3.example.com/new-file' }] } as never)
    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never) // activate
    vi.mocked(fileService.linkFileToEntity).mockResolvedValueOnce({ success: true, message: '', data: {} } as never)

    const user = userEvent.setup({ delay: null })
    await renderDialog()
    await user.click(screen.getByRole('button', { name: /new client/i }))

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, makeFile())

    await fillStep0Simple(user)
    await skipLocationStep(user)
    await user.click(screen.getByRole('button', { name: /^next$/i }))
    await fillStep1AndSubmit(user)

    // Dialog stays open through the upload/link sequence, then closes+navigates on 'done'.
    await waitFor(() => expect(fileService.linkFileToEntity).toHaveBeenCalledWith('new-file', { entityId: 'new-tenant-id' }))
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/admin/tenants/new-tenant-id'))
  })

  it('session-lifetime regression: creating a SECOND tenant with a logo in the same session also uploads', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.searchTenants).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 't-platform', name: 'QMS Platform', code: 'qms-platform', type: 'platform', address: null }], count: 1 } } as never)
    vi.mocked(accessManagementService.searchRoleTypes).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 'rt-sales-rep', code: 'sales-rep' }], count: 1 } } as never)
    vi.mocked(accessManagementService.searchRoles).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 'role-sales-rep-1', code: 'sr-001', name: 'Sales Rep One' }], count: 1 } } as never)
    vi.mocked(accessManagementService.createTenant)
      .mockResolvedValueOnce({ success: true, message: '', data: { id: 'tenant-1' } } as never)
      .mockResolvedValueOnce({ success: true, message: '', data: { id: 'tenant-2' } } as never)

    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.createFiles)
      .mockResolvedValueOnce({ success: true, message: '', data: [{ id: 'file-1', uploadUrl: 'https://s3.example.com/file-1' }] } as never)
      .mockResolvedValueOnce({ success: true, message: '', data: [{ id: 'file-2', uploadUrl: 'https://s3.example.com/file-2' }] } as never)
    vi.mocked(uploadFileToS3).mockResolvedValue(undefined)
    vi.mocked(fileService.changeFileStatus).mockResolvedValue({ success: true, message: '', data: {} } as never)
    vi.mocked(fileService.linkFileToEntity).mockResolvedValue({ success: true, message: '', data: {} } as never)

    const user = userEvent.setup({ delay: null })
    await renderDialog()

    // First tenant, with a logo — let it fully complete.
    await user.click(screen.getByRole('button', { name: /new client/i }))
    let input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, makeFile('logo1.png'))
    await fillStep0Simple(user)
    await skipLocationStep(user)
    await user.click(screen.getByRole('button', { name: /^next$/i }))
    await fillStep1AndSubmit(user)
    await waitFor(() => expect(fileService.linkFileToEntity).toHaveBeenNthCalledWith(1, 'file-1', { entityId: 'tenant-1' }))
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/admin/tenants/tenant-1'))

    // Second tenant, different logo, same page session (dialog remains mounted).
    await user.click(screen.getByRole('button', { name: /new client/i }))
    input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, makeFile('logo2.png'))
    await fillStep0Simple(user)
    await skipLocationStep(user)
    await user.click(screen.getByRole('button', { name: /^next$/i }))
    await fillStep1AndSubmit(user)

    // Regression: a bare-boolean one-shot guard would silently never fire replace() here.
    await waitFor(() => expect(fileService.linkFileToEntity).toHaveBeenNthCalledWith(2, 'file-2', { entityId: 'tenant-2' }))
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/admin/tenants/tenant-2'))
  })

  it('starting-logo window: form/footer controls are disabled and a second submit does not fire a second POST /tenants', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.searchTenants).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 't-platform', name: 'QMS Platform', code: 'qms-platform', type: 'platform', address: null }], count: 1 } } as never)
    vi.mocked(accessManagementService.searchRoleTypes).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 'rt-sales-rep', code: 'sales-rep' }], count: 1 } } as never)
    vi.mocked(accessManagementService.searchRoles).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 'role-sales-rep-1', code: 'sr-001', name: 'Sales Rep One' }], count: 1 } } as never)
    vi.mocked(accessManagementService.createTenant).mockResolvedValue({ success: true, message: '', data: { id: 'new-tenant-id' } } as never)

    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    // Hold the create-draft call open so we can inspect the dialog mid-"starting" window.
    let resolveCreateFiles: (v: unknown) => void = () => {}
    vi.mocked(fileService.createFiles).mockReturnValueOnce(new Promise((r) => { resolveCreateFiles = r }) as never)
    vi.mocked(uploadFileToS3).mockResolvedValue(undefined)
    vi.mocked(fileService.changeFileStatus).mockResolvedValue({ success: true, message: '', data: {} } as never)
    vi.mocked(fileService.linkFileToEntity).mockResolvedValue({ success: true, message: '', data: {} } as never)

    const user = userEvent.setup({ delay: null })
    await renderDialog()
    await user.click(screen.getByRole('button', { name: /new client/i }))
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, makeFile())
    await fillStep0Simple(user)
    await skipLocationStep(user)
    await user.click(screen.getByRole('button', { name: /^next$/i }))
    await user.type(screen.getByLabelText(/first name \*/i), 'Jane')
    await user.type(screen.getByLabelText(/^email \*$/i), 'jane@example.com')
    await user.type(screen.getByLabelText(/^password \*$/i), 'password123')
    await user.click(screen.getByRole('button', { name: /create company/i }))

    // "Company created" heading proves the post-create flow is active before the upload starts.
    await screen.findByText(/company created/i)
    // No footer at all is rendered during this window — the original submit button is gone.
    expect(screen.queryByRole('button', { name: /create company/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^back$/i })).not.toBeInTheDocument()
    expect(accessManagementService.createTenant).toHaveBeenCalledTimes(1)

    resolveCreateFiles({ success: true, message: '', data: [{ id: 'new-file', uploadUrl: 'https://s3.example.com/new-file' }] })
    await waitFor(() => expect(navigateMock).toHaveBeenCalled())
  })

  it('link-failed: NO "Retry" button renders; "Choose another logo" and "Continue without logo" both do; Continue is a plain close+navigate with no abandon/discard call', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.searchTenants).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 't-platform', name: 'QMS Platform', code: 'qms-platform', type: 'platform', address: null }], count: 1 } } as never)
    vi.mocked(accessManagementService.searchRoleTypes).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 'rt-sales-rep', code: 'sales-rep' }], count: 1 } } as never)
    vi.mocked(accessManagementService.searchRoles).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 'role-sales-rep-1', code: 'sr-001', name: 'Sales Rep One' }], count: 1 } } as never)
    vi.mocked(accessManagementService.createTenant).mockResolvedValue({ success: true, message: '', data: { id: 'new-tenant-id' } } as never)

    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [{ id: 'new-file', uploadUrl: 'https://s3.example.com/new-file' }] } as never)
    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never) // activate
    vi.mocked(fileService.linkFileToEntity).mockRejectedValueOnce(
      Object.assign(new Error('Bad Request'), { isAxiosError: true, response: { status: 400, data: { message: 'Validation failed' } } }),
    )
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never) // discard succeeds (inside the hook)

    const user = userEvent.setup({ delay: null })
    await renderDialog()
    await user.click(screen.getByRole('button', { name: /new client/i }))
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, makeFile())
    await fillStep0Simple(user)
    await skipLocationStep(user)
    await user.click(screen.getByRole('button', { name: /^next$/i }))
    await fillStep1AndSubmit(user)

    await screen.findByText(/couldn't attach the logo/i)
    expect(screen.queryByRole('button', { name: /^retry$/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /choose another logo/i })).toBeInTheDocument()
    const continueBtn = screen.getByRole('button', { name: /continue without logo/i })

    vi.mocked(fileService.changeFileStatus).mockClear()
    await user.click(continueBtn)

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/admin/tenants/new-tenant-id'))
    // No further changeFileStatus call from the dialog's own Continue handler (point 8 of the plan).
    expect(fileService.changeFileStatus).not.toHaveBeenCalled()
  })

  it('link-failed: "Choose another logo" actually opens the picker and re-enters the upload flow for the already-created tenant', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.searchTenants).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 't-platform', name: 'QMS Platform', code: 'qms-platform', type: 'platform', address: null }], count: 1 } } as never)
    vi.mocked(accessManagementService.searchRoleTypes).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 'rt-sales-rep', code: 'sales-rep' }], count: 1 } } as never)
    vi.mocked(accessManagementService.searchRoles).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 'role-sales-rep-1', code: 'sr-001', name: 'Sales Rep One' }], count: 1 } } as never)
    vi.mocked(accessManagementService.createTenant).mockResolvedValue({ success: true, message: '', data: { id: 'new-tenant-id' } } as never)

    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [{ id: 'first-file', uploadUrl: 'https://s3.example.com/first-file' }] } as never)
    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never) // activate
    vi.mocked(fileService.linkFileToEntity).mockRejectedValueOnce(
      Object.assign(new Error('Bad Request'), { isAxiosError: true, response: { status: 400, data: { message: 'Validation failed' } } }),
    )
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never) // discard succeeds (inside the hook)

    const user = userEvent.setup({ delay: null })
    await renderDialog()
    await user.click(screen.getByRole('button', { name: /new client/i }))
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, makeFile('first-logo.png'))
    await fillStep0Simple(user)
    await skipLocationStep(user)
    await user.click(screen.getByRole('button', { name: /^next$/i }))
    await fillStep1AndSubmit(user)

    await screen.findByText(/couldn't attach the logo/i)
    const chooseAnotherBtn = screen.getByRole('button', { name: /choose another logo/i })

    // The replacement upload succeeds fully this time.
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [{ id: 'second-file', uploadUrl: 'https://s3.example.com/second-file' }] } as never)
    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never) // activate
    vi.mocked(fileService.linkFileToEntity).mockResolvedValueOnce({ success: true, message: '', data: {} } as never)

    await user.click(chooseAnotherBtn)
    // The post-create input (not step 0's, which has unmounted) is what actually opens/receives this.
    const postCreateInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(postCreateInput).not.toBeNull()
    await user.upload(postCreateInput, makeFile('second-logo.png'))

    await waitFor(() => expect(fileService.linkFileToEntity).toHaveBeenCalledWith('second-file', { entityId: 'new-tenant-id' }))
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/admin/tenants/new-tenant-id'))
  })

  it('link-failed: picking an INVALID replacement file via "Choose another logo" shows the validation error in the status view, no network call', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.searchTenants).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 't-platform', name: 'QMS Platform', code: 'qms-platform', type: 'platform', address: null }], count: 1 } } as never)
    vi.mocked(accessManagementService.searchRoleTypes).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 'rt-sales-rep', code: 'sales-rep' }], count: 1 } } as never)
    vi.mocked(accessManagementService.searchRoles).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 'role-sales-rep-1', code: 'sr-001', name: 'Sales Rep One' }], count: 1 } } as never)
    vi.mocked(accessManagementService.createTenant).mockResolvedValue({ success: true, message: '', data: { id: 'new-tenant-id' } } as never)

    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [{ id: 'first-file', uploadUrl: 'https://s3.example.com/first-file' }] } as never)
    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never) // activate
    vi.mocked(fileService.linkFileToEntity).mockRejectedValueOnce(
      Object.assign(new Error('Bad Request'), { isAxiosError: true, response: { status: 400, data: { message: 'Validation failed' } } }),
    )
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never) // discard succeeds (inside the hook)

    const user = userEvent.setup({ delay: null })
    await renderDialog()
    await user.click(screen.getByRole('button', { name: /new client/i }))
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, makeFile('first-logo.png'))
    await fillStep0Simple(user)
    await skipLocationStep(user)
    await user.click(screen.getByRole('button', { name: /^next$/i }))
    await fillStep1AndSubmit(user)

    await screen.findByText(/couldn't attach the logo/i)
    await user.click(screen.getByRole('button', { name: /choose another logo/i }))

    const postCreateInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const badFile = makeFile('doc.pdf', 'application/pdf')
    const pickerUser = userEvent.setup({ applyAccept: false, delay: null })
    await pickerUser.upload(postCreateInput, badFile)

    expect(screen.getByText(/png, jpeg, or webp/i)).toBeInTheDocument()
    // The original link-failed banner/buttons are still there — a rejected pick is a no-op.
    expect(screen.getByText(/couldn't attach the logo/i)).toBeInTheDocument()
    expect(fileService.createFiles).not.toHaveBeenCalledTimes(2)
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('SAFETY: link-attached-elsewhere — "Continue without logo" closes+navigates with zero discard call of any kind', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.searchTenants).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 't-platform', name: 'QMS Platform', code: 'qms-platform', type: 'platform', address: null }], count: 1 } } as never)
    vi.mocked(accessManagementService.searchRoleTypes).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 'rt-sales-rep', code: 'sales-rep' }], count: 1 } } as never)
    vi.mocked(accessManagementService.searchRoles).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 'role-sales-rep-1', code: 'sr-001', name: 'Sales Rep One' }], count: 1 } } as never)
    vi.mocked(accessManagementService.createTenant).mockResolvedValue({ success: true, message: '', data: { id: 'new-tenant-id' } } as never)

    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [{ id: 'new-file', uploadUrl: 'https://s3.example.com/new-file' }] } as never)
    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never) // activate
    vi.mocked(fileService.linkFileToEntity).mockRejectedValueOnce(
      Object.assign(new Error('Conflict'), { isAxiosError: true, response: { status: 409, data: { message: 'File is already attached to an entity' } } }),
    )
    vi.mocked(fileService.getFile).mockResolvedValueOnce({
      success: true, message: '', data: { id: 'new-file', entity: { id: 'some-other-tenant' } },
    } as never)

    const user = userEvent.setup({ delay: null })
    await renderDialog()
    await user.click(screen.getByRole('button', { name: /new client/i }))
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, makeFile())
    await fillStep0Simple(user)
    await skipLocationStep(user)
    await user.click(screen.getByRole('button', { name: /^next$/i }))
    await fillStep1AndSubmit(user)

    await screen.findByText(/couldn't attach the logo/i)
    vi.mocked(fileService.changeFileStatus).mockClear()
    await user.click(screen.getByRole('button', { name: /continue without logo/i }))

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/admin/tenants/new-tenant-id'))
    expect(fileService.changeFileStatus).not.toHaveBeenCalled()
  })

  it('create-uncertain: the eventual close+navigate is preceded by a required acknowledgement click', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.searchTenants).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 't-platform', name: 'QMS Platform', code: 'qms-platform', type: 'platform', address: null }], count: 1 } } as never)
    vi.mocked(accessManagementService.searchRoleTypes).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 'rt-sales-rep', code: 'sales-rep' }], count: 1 } } as never)
    vi.mocked(accessManagementService.searchRoles).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 'role-sales-rep-1', code: 'sr-001', name: 'Sales Rep One' }], count: 1 } } as never)
    vi.mocked(accessManagementService.createTenant).mockResolvedValue({ success: true, message: '', data: { id: 'new-tenant-id' } } as never)

    const { fileService } = await import('@/lib/file/file.service')
    const networkErr = Object.assign(new Error('Network Error'), { isAxiosError: true, response: undefined })
    vi.mocked(fileService.createFiles).mockRejectedValueOnce(networkErr)

    const user = userEvent.setup({ delay: null })
    await renderDialog()
    await user.click(screen.getByRole('button', { name: /new client/i }))
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, makeFile())
    await fillStep0Simple(user)
    await skipLocationStep(user)
    await user.click(screen.getByRole('button', { name: /^next$/i }))
    await fillStep1AndSubmit(user)

    const continueBtn = await screen.findByRole('button', { name: /continue without logo/i })
    await user.click(continueBtn)

    // First click surfaces the acknowledgement — dialog must still be open, not yet navigated.
    await screen.findByText(/couldn't confirm the logo upload was cleaned up/i)
    expect(navigateMock).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /continue anyway/i }))
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/admin/tenants/new-tenant-id'))
    // create-uncertain has no known fileId — no discard call was ever attempted.
    expect(fileService.changeFileStatus).not.toHaveBeenCalled()
  })

  it('upload-failed with a real fileId known: Continue without logo calls abandonPendingUpload via the hook; \'confirmed\' closes immediately, \'unconfirmed\' requires acknowledgement', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.searchTenants).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 't-platform', name: 'QMS Platform', code: 'qms-platform', type: 'platform', address: null }], count: 1 } } as never)
    vi.mocked(accessManagementService.searchRoleTypes).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 'rt-sales-rep', code: 'sales-rep' }], count: 1 } } as never)
    vi.mocked(accessManagementService.searchRoles).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 'role-sales-rep-1', code: 'sr-001', name: 'Sales Rep One' }], count: 1 } } as never)
    vi.mocked(accessManagementService.createTenant).mockResolvedValue({ success: true, message: '', data: { id: 'new-tenant-id' } } as never)

    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [{ id: 'new-file', uploadUrl: 'https://s3.example.com/new-file' }] } as never)
    vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('S3 PUT failed'))

    const user = userEvent.setup({ delay: null })
    await renderDialog()
    await user.click(screen.getByRole('button', { name: /new client/i }))
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, makeFile())
    await fillStep0Simple(user)
    await skipLocationStep(user)
    await user.click(screen.getByRole('button', { name: /^next$/i }))
    await fillStep1AndSubmit(user)

    const continueBtn = await screen.findByRole('button', { name: /continue without logo/i })

    // 'confirmed' — the abandon discard succeeds, so this closes+navigates immediately.
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never)
    await user.click(continueBtn)
    await waitFor(() => expect(fileService.changeFileStatus).toHaveBeenCalledWith('new-file', { status: 'discarded' }))
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/admin/tenants/new-tenant-id'))
  })

  it('a genuinely hung upload (S3 PUT never settles) surfaces a "Continue without logo" escape hatch after a stall, since there is no failure state and no other way out', async () => {
    // shouldAdvanceTime keeps real async work (userEvent, waitFor) progressing while still
    // letting advanceTimersByTime fast-forward the component's own setTimeout.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
      vi.mocked(accessManagementService.searchTenants).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 't-platform', name: 'QMS Platform', code: 'qms-platform', type: 'platform', address: null }], count: 1 } } as never)
      vi.mocked(accessManagementService.searchRoleTypes).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 'rt-sales-rep', code: 'sales-rep' }], count: 1 } } as never)
      vi.mocked(accessManagementService.searchRoles).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 'role-sales-rep-1', code: 'sr-001', name: 'Sales Rep One' }], count: 1 } } as never)
      vi.mocked(accessManagementService.createTenant).mockResolvedValue({ success: true, message: '', data: { id: 'new-tenant-id' } } as never)

      const { fileService } = await import('@/lib/file/file.service')
      const { uploadFileToS3 } = await import('@/lib/file/file.upload')
      vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [{ id: 'new-file', uploadUrl: 'https://s3.example.com/new-file' }] } as never)
      // Never resolves or rejects — simulates a dropped connection / hanging backend.
      vi.mocked(uploadFileToS3).mockReturnValueOnce(new Promise(() => {}))

      const user = userEvent.setup({ delay: null })
      await renderDialog()
      await user.click(screen.getByRole('button', { name: /new client/i }))
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      await user.upload(input, makeFile())
      await fillStep0Simple(user)
      await skipLocationStep(user)
      await user.click(screen.getByRole('button', { name: /^next$/i }))
      await fillStep1AndSubmit(user)

      // Genuinely in-flight (not a failure state) — no Retry/Start over/Continue button yet.
      await screen.findByText(/uploading logo/i)
      expect(screen.queryByRole('button', { name: /continue without logo/i })).not.toBeInTheDocument()

      await vi.advanceTimersByTimeAsync(20_000)

      // The stall escape hatch appears once the upload has been in flight too long.
      expect(await screen.findByRole('button', { name: /continue without logo/i })).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('a stalled "creating" (POST /files never settles) requires the two-click acknowledgement, since it may yet create an unlinked file', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
      vi.mocked(accessManagementService.searchTenants).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 't-platform', name: 'QMS Platform', code: 'qms-platform', type: 'platform', address: null }], count: 1 } } as never)
      vi.mocked(accessManagementService.searchRoleTypes).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 'rt-sales-rep', code: 'sales-rep' }], count: 1 } } as never)
      vi.mocked(accessManagementService.searchRoles).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 'role-sales-rep-1', code: 'sr-001', name: 'Sales Rep One' }], count: 1 } } as never)
      vi.mocked(accessManagementService.createTenant).mockResolvedValue({ success: true, message: '', data: { id: 'new-tenant-id' } } as never)

      const { fileService } = await import('@/lib/file/file.service')
      // Never resolves or rejects — the POST /files call itself is stuck.
      vi.mocked(fileService.createFiles).mockReturnValueOnce(new Promise(() => {}))

      const user = userEvent.setup({ delay: null })
      await renderDialog()
      await user.click(screen.getByRole('button', { name: /new client/i }))
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      await user.upload(input, makeFile())
      await fillStep0Simple(user)
      await skipLocationStep(user)
      await user.click(screen.getByRole('button', { name: /^next$/i }))
      await fillStep1AndSubmit(user)

      await vi.advanceTimersByTimeAsync(20_000)
      const continueBtn = await screen.findByRole('button', { name: /continue without logo/i })
      await user.click(continueBtn)

      // No fileId ever existed to discard — but the outcome must still be treated as unconfirmed,
      // not closed immediately, since the stuck POST may yet create+upload+activate a real file.
      expect(fileService.changeFileStatus).not.toHaveBeenCalled()
      await screen.findByText(/couldn't confirm the logo upload was cleaned up/i)
      expect(navigateMock).not.toHaveBeenCalled()

      await user.click(screen.getByRole('button', { name: /continue anyway/i }))
      await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/admin/tenants/new-tenant-id'))
    } finally {
      vi.useRealTimers()
    }
  })

  it("upload-failed with 'unconfirmed' abandon result requires the two-click acknowledgement before closing", async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.searchTenants).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 't-platform', name: 'QMS Platform', code: 'qms-platform', type: 'platform', address: null }], count: 1 } } as never)
    vi.mocked(accessManagementService.searchRoleTypes).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 'rt-sales-rep', code: 'sales-rep' }], count: 1 } } as never)
    vi.mocked(accessManagementService.searchRoles).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 'role-sales-rep-1', code: 'sr-001', name: 'Sales Rep One' }], count: 1 } } as never)
    vi.mocked(accessManagementService.createTenant).mockResolvedValue({ success: true, message: '', data: { id: 'new-tenant-id' } } as never)

    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [{ id: 'new-file', uploadUrl: 'https://s3.example.com/new-file' }] } as never)
    vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('S3 PUT failed'))

    const user = userEvent.setup({ delay: null })
    await renderDialog()
    await user.click(screen.getByRole('button', { name: /new client/i }))
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, makeFile())
    await fillStep0Simple(user)
    await skipLocationStep(user)
    await user.click(screen.getByRole('button', { name: /^next$/i }))
    await fillStep1AndSubmit(user)

    const continueBtn = await screen.findByRole('button', { name: /continue without logo/i })

    // The abandon discard call itself fails — 'unconfirmed'.
    const networkErr = Object.assign(new Error('Network Error'), { isAxiosError: true, response: undefined })
    vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(networkErr)
    await user.click(continueBtn)

    await screen.findByText(/couldn't confirm the logo upload was cleaned up/i)
    expect(navigateMock).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /continue anyway/i }))
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/admin/tenants/new-tenant-id'))
  })

  it('closing the dialog (Escape / backdrop click) is a no-op for the entire post-create window, including during a terminal failure state', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.searchTenants).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 't-platform', name: 'QMS Platform', code: 'qms-platform', type: 'platform', address: null }], count: 1 } } as never)
    vi.mocked(accessManagementService.searchRoleTypes).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 'rt-sales-rep', code: 'sales-rep' }], count: 1 } } as never)
    vi.mocked(accessManagementService.searchRoles).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 'role-sales-rep-1', code: 'sr-001', name: 'Sales Rep One' }], count: 1 } } as never)
    vi.mocked(accessManagementService.createTenant).mockResolvedValue({ success: true, message: '', data: { id: 'new-tenant-id' } } as never)

    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [{ id: 'new-file', uploadUrl: 'https://s3.example.com/new-file' }] } as never)
    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never) // activate
    vi.mocked(fileService.linkFileToEntity).mockRejectedValueOnce(
      Object.assign(new Error('Bad Request'), { isAxiosError: true, response: { status: 400, data: { message: 'Validation failed' } } }),
    )
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never) // discard succeeds

    const user = userEvent.setup({ delay: null })
    await renderDialog()
    await user.click(screen.getByRole('button', { name: /new client/i }))
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, makeFile())
    await fillStep0Simple(user)
    await skipLocationStep(user)
    await user.click(screen.getByRole('button', { name: /^next$/i }))
    await fillStep1AndSubmit(user)

    // Terminal failure state — attempt to close via Escape.
    await screen.findByText(/couldn't attach the logo/i)
    await user.keyboard('{Escape}')

    // Still open — the failure banner and its actions remain visible, no navigation happened.
    expect(screen.getByText(/couldn't attach the logo/i)).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  async function mockPlatformStaff() {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.searchTenants).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 't-platform', name: 'QMS Platform', code: 'qms-platform', type: 'platform', address: null }], count: 1 } } as never)
    vi.mocked(accessManagementService.searchRoleTypes).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 'rt-sales-rep', code: 'sales-rep' }], count: 1 } } as never)
    vi.mocked(accessManagementService.searchRoles).mockResolvedValue({ success: true, message: '', data: { items: [{ id: 'role-sales-rep-1', code: 'sr-001', name: 'Sales Rep One' }], count: 1 } } as never)
    vi.mocked(accessManagementService.createTenant).mockResolvedValue({ success: true, message: '', data: { id: 'new-tenant-id' } } as never)
  }

  it('upload-failed shows only Try again on the first failure — Start a new upload appears only after a retry also fails', async () => {
    await mockPlatformStaff()
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.createFiles).mockResolvedValue({ success: true, message: '', data: [{ id: 'new-file', uploadUrl: 'https://s3.example.com/new-file' }] } as never)
    vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('S3 PUT failed'))

    const user = userEvent.setup({ delay: null })
    await renderDialog()
    await user.click(screen.getByRole('button', { name: /new client/i }))
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, makeFile())
    await fillStep0Simple(user)
    await skipLocationStep(user)
    await user.click(screen.getByRole('button', { name: /^next$/i }))
    await fillStep1AndSubmit(user)

    await screen.findByRole('button', { name: /try again/i })
    expect(screen.queryByRole('button', { name: /start a new upload/i })).not.toBeInTheDocument()

    vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('S3 PUT failed again'))
    await user.click(screen.getByRole('button', { name: /try again/i }))
    await screen.findByRole('button', { name: /start a new upload/i })
  })

  it("selecting an invalid replacement file does NOT reset an already-visible fallback", async () => {
    await mockPlatformStaff()
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.createFiles).mockResolvedValue({ success: true, message: '', data: [{ id: 'new-file', uploadUrl: 'https://s3.example.com/new-file' }] } as never)
    vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('S3 PUT failed'))

    const user = userEvent.setup({ delay: null })
    await renderDialog()
    await user.click(screen.getByRole('button', { name: /new client/i }))
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, makeFile())
    await fillStep0Simple(user)
    await skipLocationStep(user)
    await user.click(screen.getByRole('button', { name: /^next$/i }))
    await fillStep1AndSubmit(user)

    await screen.findByRole('button', { name: /try again/i })
    vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('S3 PUT failed again'))
    await user.click(screen.getByRole('button', { name: /try again/i }))
    await screen.findByRole('button', { name: /start a new upload/i })

    // Pick an invalid file — a no-op from the upload state's perspective.
    const badFile = makeFile('doc.pdf', 'application/pdf')
    const pickerUser = userEvent.setup({ applyAccept: false, delay: null })
    await pickerUser.upload(input, badFile)

    // The earned fallback must survive the rejected pick.
    expect(screen.getByRole('button', { name: /start a new upload/i })).toBeInTheDocument()
  })

  it('confirming "Start new upload," then failing the new upload, returns to first-failure UX (Try again only)', async () => {
    await mockPlatformStaff()
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [{ id: 'new-file', uploadUrl: 'https://s3.example.com/new-file' }] } as never)
    vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('S3 PUT failed'))

    const user = userEvent.setup({ delay: null })
    await renderDialog()
    await user.click(screen.getByRole('button', { name: /new client/i }))
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, makeFile())
    await fillStep0Simple(user)
    await skipLocationStep(user)
    await user.click(screen.getByRole('button', { name: /^next$/i }))
    await fillStep1AndSubmit(user)

    await screen.findByRole('button', { name: /try again/i })
    vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('S3 PUT failed again'))
    await user.click(screen.getByRole('button', { name: /try again/i }))
    await screen.findByRole('button', { name: /start a new upload/i })

    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never)
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [{ id: 'draft-2', uploadUrl: 'https://s3.example.com/draft-2' }] } as never)
    vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('draft-2 also failed'))

    await user.click(screen.getByRole('button', { name: /start a new upload/i }))
    await user.click(await screen.findByRole('button', { name: /^start new upload$/i }))

    // Fresh attempt (draft-2) failed too — the flag was genuinely reset, back to first-failure grace.
    await screen.findByRole('button', { name: /try again/i })
    expect(screen.queryByRole('button', { name: /start a new upload/i })).not.toBeInTheDocument()
  })

  it('Escape/Cancel on the nested start-over confirmation closes only the confirmation, not the create-tenant dialog', async () => {
    await mockPlatformStaff()
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.createFiles).mockResolvedValue({ success: true, message: '', data: [{ id: 'new-file', uploadUrl: 'https://s3.example.com/new-file' }] } as never)
    vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('S3 PUT failed'))

    const user = userEvent.setup({ delay: null })
    await renderDialog()
    await user.click(screen.getByRole('button', { name: /new client/i }))
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, makeFile())
    await fillStep0Simple(user)
    await skipLocationStep(user)
    await user.click(screen.getByRole('button', { name: /^next$/i }))
    await fillStep1AndSubmit(user)

    await screen.findByRole('button', { name: /try again/i })
    vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('S3 PUT failed again'))
    await user.click(screen.getByRole('button', { name: /try again/i }))
    const trigger = await screen.findByRole('button', { name: /start a new upload/i })
    await user.click(trigger)

    // The confirmation dialog is open.
    expect(await screen.findByText('Start a new upload?')).toBeInTheDocument()
    await user.keyboard('{Escape}')

    // The confirmation closed, but the outer create-tenant dialog is still open on upload-failed.
    await waitFor(() => expect(screen.queryByText('Start a new upload?')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: /start a new upload/i })).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()
    expect(fileService.changeFileStatus).not.toHaveBeenCalled()
    // Focus returns to the trigger, not lost to the document body or the outer dialog's own close button.
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('a fresh S3 upload that stalls after a successful restart still shows the 20s "Continue without logo" escape hatch', async () => {
    // shouldAdvanceTime keeps real async work (userEvent, waitFor) progressing while still
    // letting advanceTimersByTime fast-forward the component's own setTimeout.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      await mockPlatformStaff()
      const { fileService } = await import('@/lib/file/file.service')
      const { uploadFileToS3 } = await import('@/lib/file/file.upload')
      vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [{ id: 'new-file', uploadUrl: 'https://s3.example.com/new-file' }] } as never)
      vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('S3 PUT failed'))

      const user = userEvent.setup({ delay: null })
      await renderDialog()
      await user.click(screen.getByRole('button', { name: /new client/i }))
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      await user.upload(input, makeFile())
      await fillStep0Simple(user)
      await skipLocationStep(user)
      await user.click(screen.getByRole('button', { name: /^next$/i }))
      await fillStep1AndSubmit(user)

      await screen.findByRole('button', { name: /try again/i })
      vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('S3 PUT failed again'))
      await user.click(screen.getByRole('button', { name: /try again/i }))
      await user.click(await screen.findByRole('button', { name: /start a new upload/i }))

      // Restart's discard succeeds and the fresh draft is created, but its own S3 PUT hangs.
      vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never)
      vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [{ id: 'draft-2', uploadUrl: 'https://s3.example.com/draft-2' }] } as never)
      vi.mocked(uploadFileToS3).mockReturnValueOnce(new Promise(() => {}))

      await user.click(await screen.findByRole('button', { name: /^start new upload$/i }))

      await screen.findByText(/uploading logo/i)
      expect(screen.queryByRole('button', { name: /continue without logo/i })).not.toBeInTheDocument()

      await vi.advanceTimersByTimeAsync(20_000)

      expect(await screen.findByRole('button', { name: /continue without logo/i })).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('done with priorDraftCleanupConfirmed:false does NOT auto-close — requires acknowledgement; true/null auto-close as before', async () => {
    await mockPlatformStaff()
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [{ id: 'draft-1', uploadUrl: 'https://s3.example.com/draft-1' }] } as never)
    vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('S3 PUT failed'))

    const user = userEvent.setup({ delay: null })
    await renderDialog()
    await user.click(screen.getByRole('button', { name: /new client/i }))
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, makeFile())
    await fillStep0Simple(user)
    await skipLocationStep(user)
    await user.click(screen.getByRole('button', { name: /^next$/i }))
    await fillStep1AndSubmit(user)

    await screen.findByRole('button', { name: /try again/i })
    vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('S3 PUT failed again'))
    await user.click(screen.getByRole('button', { name: /try again/i }))
    await user.click(await screen.findByRole('button', { name: /start a new upload/i }))

    // Restart's own discard fails -> priorDraftCleanupConfirmed: false. Fresh draft-2 succeeds fully.
    vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(new Error('discard failed'))
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [{ id: 'draft-2', uploadUrl: 'https://s3.example.com/draft-2' }] } as never)
    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never) // activate
    vi.mocked(fileService.linkFileToEntity).mockResolvedValueOnce({ success: true, message: '', data: {} } as never)

    await user.click(await screen.findByRole('button', { name: /^start new upload$/i }))

    // Company created + logo attached, but the dialog must NOT auto-close — cleanup is unconfirmed.
    await screen.findByText(/couldn't confirm an earlier failed upload/i)
    expect(navigateMock).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /continue anyway/i }))
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/admin/tenants/new-tenant-id'))
  })
})
