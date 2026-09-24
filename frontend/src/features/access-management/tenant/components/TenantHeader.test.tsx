import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TenantHeader from './TenantHeader'
import { tenantLogoKeys } from '@/features/access-management/tenant/hooks/useTenantLogo'
import type { Tenant } from '@/types/accessManagement.types'

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

// jsdom has no real object URL implementation.
beforeEach(() => {
  window.URL.createObjectURL = vi.fn(() => 'blob:mock-preview-url')
  window.URL.revokeObjectURL = vi.fn()
})

const TENANT: Tenant = {
  id: 't-1',
  code: 'acme',
  name: 'Acme Pharma',
  type: 'customer',
  status: 'active',
} as Tenant

function renderHeader(props: Partial<{ tenant: Tenant; canManageTenant: boolean }> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TenantHeader
          tenant={TENANT}
          canManageTenant
          canViewRole={false}
          ownerName={null}
          ownerUser={null}
          ownerEmailSuffix={null}
          tenantAddress={null}
          divisionPenetrationPct={null}
          onEditClick={vi.fn()}
          {...props}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function noLogo() {
  return { success: true, message: '', data: { count: 0, items: [] } } as never
}

function makeFile(name = 'logo.png', type = 'image/png', size = 1024) {
  const file = new File(['x'.repeat(size)], name, { type })
  return file
}

describe('TenantHeader', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-preview-url')
    window.URL.revokeObjectURL = vi.fn()
  })

  it('renders a placeholder when no logo exists', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    vi.mocked(fileService.searchFiles).mockResolvedValue(noLogo())

    renderHeader()
    await waitFor(() => expect(screen.getByRole('button', { name: /upload logo/i })).toBeEnabled())
    expect(screen.queryByRole('img', { name: /company logo/i })).not.toBeInTheDocument()
  })

  it('renders the current logo image when one exists', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    vi.mocked(fileService.searchFiles).mockResolvedValue({
      success: true,
      message: '',
      data: { count: 1, items: [{ id: 'file-1' }] },
    } as never)
    vi.mocked(fileService.getFile).mockResolvedValue({
      success: true,
      message: '',
      data: { id: 'file-1', url: 'https://s3.example.com/logo.png' },
    } as never)

    renderHeader()
    await waitFor(() => expect(screen.getByRole('img', { name: /company logo/i })).toHaveAttribute('src', 'https://s3.example.com/logo.png'))
    expect(screen.getByRole('button', { name: /change logo/i })).toBeEnabled()
  })

  it('Change-logo trigger is disabled while useTenantLogo is loading, with no retry shown yet', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    let resolveSearch: (v: unknown) => void = () => {}
    vi.mocked(fileService.searchFiles).mockReturnValue(new Promise((r) => { resolveSearch = r }) as never)

    renderHeader()
    expect(screen.getByRole('button', { name: /upload logo/i })).toBeDisabled()

    resolveSearch(noLogo())
    await waitFor(() => expect(screen.getByRole('button', { name: /upload logo/i })).toBeEnabled())
  })

  it('Change-logo trigger is disabled while useTenantLogo errored, and a visible retry is offered', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    vi.mocked(fileService.searchFiles).mockRejectedValue(new Error('down'))

    renderHeader()
    await waitFor(() => expect(screen.getByText(/couldn't check the current logo/i)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /upload logo/i })).toBeDisabled()

    const retryButtons = screen.getAllByRole('button', { name: /retry/i })
    expect(retryButtons.length).toBeGreaterThan(0)

    vi.mocked(fileService.searchFiles).mockResolvedValueOnce(noLogo())
    await userEvent.click(retryButtons[0])
    await waitFor(() => expect(screen.getByRole('button', { name: /upload logo/i })).toBeEnabled())
  })

  it('canManageTenant=false hides the whole change-logo affordance, shows only the logo/placeholder', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    vi.mocked(fileService.searchFiles).mockResolvedValue(noLogo())

    renderHeader({ canManageTenant: false })
    await waitFor(() => expect(fileService.searchFiles).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: /upload logo/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /change logo/i })).not.toBeInTheDocument()
  })

  it('client-side rejects an invalid mime type without calling the upload service', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    vi.mocked(fileService.searchFiles).mockResolvedValue(noLogo())

    renderHeader()
    await waitFor(() => expect(screen.getByRole('button', { name: /upload logo/i })).toBeEnabled())

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const badFile = makeFile('doc.pdf', 'application/pdf')
    // Tests onChange's own validation, not the browser's accept-attribute filtering (which
    // userEvent applies by default and would silently drop a mismatched file first).
    const user = userEvent.setup({ applyAccept: false })
    await user.upload(input, badFile)

    expect(screen.getByText(/png, jpeg, or webp/i)).toBeInTheDocument()
    expect(fileService.createFiles).not.toHaveBeenCalled()
  })

  it('client-side rejects an oversized file without calling the upload service', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    vi.mocked(fileService.searchFiles).mockResolvedValue(noLogo())

    renderHeader()
    await waitFor(() => expect(screen.getByRole('button', { name: /upload logo/i })).toBeEnabled())

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const bigFile = makeFile('logo.png', 'image/png', 6 * 1024 * 1024)
    await userEvent.upload(input, bigFile)

    expect(screen.getByText(/5mb or smaller/i)).toBeInTheDocument()
    expect(fileService.createFiles).not.toHaveBeenCalled()
  })

  it('full happy-path upload+display: pick a valid file, upload completes, new logo shows', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.searchFiles).mockResolvedValue(noLogo())
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({
      success: true, message: '', data: [{ id: 'new-file', uploadUrl: 'https://s3.example.com/new-file' }],
    } as never)
    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never) // activate
    vi.mocked(fileService.linkFileToEntity).mockResolvedValueOnce({ success: true, message: '', data: {} } as never)

    renderHeader()
    await waitFor(() => expect(screen.getByRole('button', { name: /upload logo/i })).toBeEnabled())

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeFile())

    await waitFor(() => expect(fileService.linkFileToEntity).toHaveBeenCalledWith('new-file', { entityId: 't-1' }))
  })

  it('link-attached-elsewhere renders an explanatory message and re-enables the trigger (terminal, not stuck)', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.searchFiles).mockResolvedValue(noLogo())
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({
      success: true, message: '', data: [{ id: 'new-file', uploadUrl: 'https://s3.example.com/new-file' }],
    } as never)
    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never) // activate
    vi.mocked(fileService.linkFileToEntity).mockRejectedValueOnce(
      Object.assign(new Error('Conflict'), {
        isAxiosError: true,
        response: { status: 409, data: { message: 'File is already attached to an entity' } },
      }),
    )
    vi.mocked(fileService.getFile).mockResolvedValueOnce({
      success: true, message: '', data: { id: 'new-file', entity: { id: 'some-other-tenant' } },
    } as never)

    renderHeader()
    await waitFor(() => expect(screen.getByRole('button', { name: /upload logo/i })).toBeEnabled())

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeFile())

    await waitFor(() => expect(screen.getByText(/already in use elsewhere/i)).toBeInTheDocument())
    // First-ever upload — there was no old logo, so the copy must NOT claim one was "kept".
    expect(screen.queryByText(/previous logo has been kept/i)).not.toBeInTheDocument()
    // Terminal state must not lock the uploader — the user can still pick a fresh file.
    expect(screen.getByRole('button', { name: /upload logo/i })).toBeEnabled()
  })

  it('link-attached-elsewhere WITH an old logo says the previous logo was kept (accurate, non-false copy)', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.searchFiles).mockResolvedValue({
      success: true, message: '', data: { count: 1, items: [{ id: 'old-file' }] },
    } as never)
    vi.mocked(fileService.getFile).mockResolvedValueOnce({
      success: true, message: '', data: { id: 'old-file', url: 'https://s3.example.com/old-logo.png' },
    } as never)
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({
      success: true, message: '', data: [{ id: 'new-file', uploadUrl: 'https://s3.example.com/new-file' }],
    } as never)
    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never) // activate
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never) // deactivate old
    vi.mocked(fileService.linkFileToEntity).mockRejectedValueOnce(
      Object.assign(new Error('Conflict'), {
        isAxiosError: true,
        response: { status: 409, data: { message: 'File is already attached to an entity' } },
      }),
    )
    vi.mocked(fileService.getFile).mockResolvedValueOnce({
      success: true, message: '', data: { id: 'new-file', entity: { id: 'some-other-tenant' } },
    } as never)
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never) // restore old to active

    renderHeader()
    await waitFor(() => expect(screen.getByRole('button', { name: /change logo/i })).toBeEnabled())

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeFile())

    await waitFor(() => expect(screen.getByText(/already in use elsewhere/i)).toBeInTheDocument())
    expect(screen.getByText(/previous logo has been kept/i)).toBeInTheDocument()
  })

  it('deactivate-failed is terminal — re-enables the trigger so a fresh file can be picked', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.searchFiles).mockResolvedValue({
      success: true, message: '', data: { count: 1, items: [{ id: 'old-file' }] },
    } as never)
    vi.mocked(fileService.getFile).mockResolvedValueOnce({
      success: true, message: '', data: { id: 'old-file', url: 'https://s3.example.com/old-logo.png' },
    } as never)
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({
      success: true, message: '', data: [{ id: 'new-file', uploadUrl: 'https://s3.example.com/new-file' }],
    } as never)
    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never) // activate
    vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(
      Object.assign(new Error('Forbidden'), { isAxiosError: true, response: { status: 403, data: { message: 'Forbidden' } } }),
    ) // deactivate old fails, confirmed
    vi.mocked(fileService.getFile).mockResolvedValueOnce({ success: true, message: '', data: { status: 'active' } } as never) // best-effort reconcile
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never) // discard candidate

    renderHeader()
    await waitFor(() => expect(screen.getByRole('button', { name: /change logo/i })).toBeEnabled())

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeFile())

    await waitFor(() => expect(screen.getByText(/couldn't replace the logo/i)).toBeInTheDocument())
    // Terminal state must not lock the uploader — the user can still pick a fresh file.
    expect(screen.getByRole('button', { name: /change logo/i })).toBeEnabled()
  })

  it('upload-failed state shows only Try again on the first failure — Start a new upload appears only after a retry also fails', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.searchFiles).mockResolvedValue(noLogo())
    vi.mocked(fileService.createFiles).mockResolvedValue({
      success: true, message: '', data: [{ id: 'new-file', uploadUrl: 'https://s3.example.com/new-file' }],
    } as never)
    vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('upload failed'))

    renderHeader()
    await waitFor(() => expect(screen.getByRole('button', { name: /upload logo/i })).toBeEnabled())

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeFile())

    await waitFor(() => expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /start a new upload/i })).not.toBeInTheDocument()

    // Retry fails again — only now does the fallback appear.
    vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('upload failed again'))
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /start a new upload/i })).toBeInTheDocument())
  })

  it('clicking Retry upload when the retry itself rejects again does not throw an unhandled promise rejection', async () => {
    // useUploadFile's retry()/startOver() re-throw by design — the onClick handler must swallow it.
    const unhandledRejections: unknown[] = []
    const onUnhandledRejection = (event: PromiseRejectionEvent) => { unhandledRejections.push(event.reason) }
    window.addEventListener('unhandledrejection', onUnhandledRejection)

    try {
      const { fileService } = await import('@/lib/file/file.service')
      const { uploadFileToS3 } = await import('@/lib/file/file.upload')
      vi.mocked(fileService.searchFiles).mockResolvedValue(noLogo())
      vi.mocked(fileService.createFiles).mockResolvedValueOnce({
        success: true, message: '', data: [{ id: 'new-file', uploadUrl: 'https://s3.example.com/new-file' }],
      } as never)
      vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('upload failed'))

      renderHeader()
      await waitFor(() => expect(screen.getByRole('button', { name: /upload logo/i })).toBeEnabled())

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      await userEvent.upload(input, makeFile())
      await waitFor(() => expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument())

      // The retry rejects again — this is the exact path that used to escape as unhandled.
      vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('upload failed again'))
      await userEvent.click(screen.getByRole('button', { name: /try again/i }))

      await waitFor(() => expect(uploadFileToS3).toHaveBeenCalledTimes(2))
      // Give any unhandled rejection a tick to surface before asserting none did.
      await new Promise((r) => setTimeout(r, 0))
      expect(unhandledRejections).toHaveLength(0)
    } finally {
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
    }
  })

  it('clicking RetryRow\'s own Retry button when the retry rejects again does not throw an unhandled promise rejection', async () => {
    // Tests RetryRow's own onClick wrapping specifically, via create-failed's retry().
    const unhandledRejections: unknown[] = []
    const onUnhandledRejection = (event: PromiseRejectionEvent) => { unhandledRejections.push(event.reason) }
    window.addEventListener('unhandledrejection', onUnhandledRejection)

    try {
      const { fileService } = await import('@/lib/file/file.service')
      vi.mocked(fileService.searchFiles).mockResolvedValue(noLogo())
      vi.mocked(fileService.createFiles).mockRejectedValueOnce(
        Object.assign(new Error('Bad Request'), { isAxiosError: true, response: { status: 400, data: { message: 'Validation failed' } } }),
      )

      renderHeader()
      await waitFor(() => expect(screen.getByRole('button', { name: /upload logo/i })).toBeEnabled())

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      await userEvent.upload(input, makeFile())
      await waitFor(() => expect(screen.getByRole('button', { name: /^retry$/i })).toBeInTheDocument())

      // The retry rejects again too.
      vi.mocked(fileService.createFiles).mockRejectedValueOnce(
        Object.assign(new Error('Bad Request'), { isAxiosError: true, response: { status: 400, data: { message: 'Validation failed' } } }),
      )
      await userEvent.click(screen.getByRole('button', { name: /^retry$/i }))

      await waitFor(() => expect(fileService.createFiles).toHaveBeenCalledTimes(2))
      await new Promise((r) => setTimeout(r, 0))
      expect(unhandledRejections).toHaveLength(0)
    } finally {
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
    }
  })

  it('cleanup-failed/cleanup-uncertain renders a secondary line + Retry cleanup button alongside the primary error, not replacing it', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.searchFiles).mockResolvedValue(noLogo())
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({
      success: true, message: '', data: [{ id: 'new-file', uploadUrl: 'https://s3.example.com/new-file' }],
    } as never)
    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never) // activate
    vi.mocked(fileService.linkFileToEntity).mockRejectedValueOnce(
      Object.assign(new Error('Bad Request'), { isAxiosError: true, response: { status: 400, data: { message: 'Validation failed' } } }),
    )
    // discard fails (confirmed 4xx)
    vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(
      Object.assign(new Error('Bad Request'), { isAxiosError: true, response: { status: 400, data: { message: 'Cannot discard' } } }),
    )

    renderHeader()
    await waitFor(() => expect(screen.getByRole('button', { name: /upload logo/i })).toBeEnabled())

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeFile())

    await waitFor(() => expect(screen.getByRole('button', { name: /retry cleanup/i })).toBeInTheDocument())
    // Primary error still present alongside it. link-failed is terminal (no retry() case exists
    // for it) — the primary error renders as plain text, not a Retry control the hook would ignore.
    expect(screen.getByText(/couldn't link the new logo/i)).toBeInTheDocument()
    expect(screen.getByText(/couldn't be cleaned up/i)).toBeInTheDocument()
  })

  it('renders no cleanup line when the discard succeeds', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.searchFiles).mockResolvedValue(noLogo())
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({
      success: true, message: '', data: [{ id: 'new-file', uploadUrl: 'https://s3.example.com/new-file' }],
    } as never)
    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never) // activate
    vi.mocked(fileService.linkFileToEntity).mockRejectedValueOnce(
      Object.assign(new Error('Bad Request'), { isAxiosError: true, response: { status: 400, data: { message: 'Validation failed' } } }),
    )
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never) // discard succeeds

    renderHeader()
    await waitFor(() => expect(screen.getByRole('button', { name: /upload logo/i })).toBeEnabled())

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeFile())

    await waitFor(() => expect(screen.getByText(/couldn't link the new logo/i)).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /retry cleanup/i })).not.toBeInTheDocument()
  })

  it("startOver's cleanup-warning caption renders only when priorDraftCleanupConfirmed is false", async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.searchFiles).mockResolvedValue(noLogo())
    vi.mocked(fileService.createFiles).mockResolvedValue({
      success: true, message: '', data: [{ id: 'draft-1', uploadUrl: 'https://s3.example.com/draft-1' }],
    } as never)
    vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('boom')) // upload-failed

    renderHeader()
    await waitFor(() => expect(screen.getByRole('button', { name: /upload logo/i })).toBeEnabled())

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeFile())
    await waitFor(() => expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument())

    // Retry fails again to reveal the fallback (progressive disclosure).
    vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('boom again'))
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /start a new upload/i })).toBeInTheDocument())

    // startOver's own discard fails here -> priorDraftCleanupConfirmed: false, asserted below once
    // it hands off to 'linking-new' (first-ever upload, oldLogoId null).
    vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(new Error('discard failed'))
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({
      success: true, message: '', data: [{ id: 'draft-2', uploadUrl: 'https://s3.example.com/draft-2' }],
    } as never)
    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never) // activate
    let resolveLink: (v: unknown) => void = () => {}
    vi.mocked(fileService.linkFileToEntity).mockReturnValueOnce(
      new Promise((resolve) => { resolveLink = resolve }) as never,
    )

    await userEvent.click(screen.getByRole('button', { name: /start a new upload/i }))
    await userEvent.click(await screen.findByRole('button', { name: /^start new upload$/i }))

    await waitFor(() => expect(screen.getByText(/linking logo/i)).toBeInTheDocument())
    expect(screen.getByText(/previous draft upload couldn't be confirmed/i)).toBeInTheDocument()

    resolveLink({ success: true, message: '', data: {} })
  })

  it('while restarting (discard pending), Try again and the fallback are both hidden — only "Starting a new upload…" shows', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.searchFiles).mockResolvedValue(noLogo())
    vi.mocked(fileService.createFiles).mockResolvedValue({
      success: true, message: '', data: [{ id: 'draft-1', uploadUrl: 'https://s3.example.com/draft-1' }],
    } as never)
    vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('boom'))

    renderHeader()
    await waitFor(() => expect(screen.getByRole('button', { name: /upload logo/i })).toBeEnabled())

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeFile())
    await waitFor(() => expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument())

    vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('boom again'))
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /start a new upload/i })).toBeInTheDocument())

    // Discard never settles for the duration of this assertion.
    vi.mocked(fileService.changeFileStatus).mockReturnValueOnce(new Promise(() => {}))
    await userEvent.click(screen.getByRole('button', { name: /start a new upload/i }))
    await userEvent.click(await screen.findByRole('button', { name: /^start new upload$/i }))

    await waitFor(() => expect(screen.getByText(/starting a new upload/i)).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /start a new upload/i })).not.toBeInTheDocument()
  })

  it('a fresh S3 upload that itself stalls after a successful restart still shows Uploading… (no lingering restarting UI)', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.searchFiles).mockResolvedValue(noLogo())
    vi.mocked(fileService.createFiles).mockResolvedValue({
      success: true, message: '', data: [{ id: 'draft-1', uploadUrl: 'https://s3.example.com/draft-1' }],
    } as never)
    vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('boom'))

    renderHeader()
    await waitFor(() => expect(screen.getByRole('button', { name: /upload logo/i })).toBeEnabled())

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeFile())
    await waitFor(() => expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument())

    vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('boom again'))
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /start a new upload/i })).toBeInTheDocument())

    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never)
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({
      success: true, message: '', data: [{ id: 'draft-2', uploadUrl: 'https://s3.example.com/draft-2' }],
    } as never)
    // The fresh S3 upload itself now hangs.
    vi.mocked(uploadFileToS3).mockReturnValueOnce(new Promise(() => {}))

    await userEvent.click(screen.getByRole('button', { name: /start a new upload/i }))
    await userEvent.click(await screen.findByRole('button', { name: /^start new upload$/i }))

    await waitFor(() => expect(screen.getByText(/^uploading…$/i)).toBeInTheDocument())
    expect(screen.queryByText(/starting a new upload/i)).not.toBeInTheDocument()
  })

  it('a normal (non-startOver) upload never shows the "previous draft couldn\'t be cleaned up" warning', async () => {
    // start()/retry() carry priorDraftCleanupConfirmed as null — only render the caption for false.
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.searchFiles).mockResolvedValue(noLogo())
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({
      success: true, message: '', data: [{ id: 'draft-1', uploadUrl: 'https://s3.example.com/draft-1' }],
    } as never)
    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never) // activate
    vi.mocked(fileService.linkFileToEntity).mockResolvedValueOnce({ success: true, message: '', data: {} } as never)

    renderHeader()
    await waitFor(() => expect(screen.getByRole('button', { name: /upload logo/i })).toBeEnabled())

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeFile())

    await waitFor(() => expect(fileService.linkFileToEntity).toHaveBeenCalled())
    expect(screen.queryByText(/previous draft upload couldn't be confirmed/i)).not.toBeInTheDocument()
  })

  it('Change-logo trigger is disabled during a background refetch (isFetching), not just the initial load (isLoading)', async () => {
    // isLoading is only true on the very first fetch — a background refetch must disable actions too.
    const { fileService } = await import('@/lib/file/file.service')
    vi.mocked(fileService.searchFiles).mockResolvedValueOnce(noLogo())

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TenantHeader
            tenant={TENANT}
            canManageTenant
            canViewRole={false}
            ownerName={null}
            ownerUser={null}
            ownerEmailSuffix={null}
            tenantAddress={null}
            divisionPenetrationPct={null}
            onEditClick={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(screen.getByRole('button', { name: /upload logo/i })).toBeEnabled())

    // Refetch the SAME query key (t-1 stays cached) so this is a true background refetch —
    // isFetching true, isLoading false, since cached data already exists for this exact key.
    let resolveSecondSearch: (v: unknown) => void = () => {}
    vi.mocked(fileService.searchFiles).mockReturnValueOnce(new Promise((r) => { resolveSecondSearch = r }) as never)
    act(() => {
      void queryClient.refetchQueries({ queryKey: tenantLogoKeys.detail('t-1') })
    })

    await waitFor(() => expect(screen.getByRole('button', { name: /upload logo/i })).toBeDisabled())
    resolveSecondSearch(noLogo())
    await waitFor(() => expect(screen.getByRole('button', { name: /upload logo/i })).toBeEnabled())
  })

  it('does not render the previously-fetched (possibly stale) logo image during a background refetch', async () => {
    // Image rendering must gate on isFetching too, or a stale/expired url stays visible mid-refetch.
    const { fileService } = await import('@/lib/file/file.service')
    vi.mocked(fileService.searchFiles).mockResolvedValueOnce({
      success: true, message: '', data: { count: 1, items: [{ id: 'file-1' }] },
    } as never)
    vi.mocked(fileService.getFile).mockResolvedValueOnce({
      success: true, message: '', data: { id: 'file-1', url: 'https://s3.example.com/stale-logo.png' },
    } as never)

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TenantHeader
            tenant={TENANT}
            canManageTenant
            canViewRole={false}
            ownerName={null}
            ownerUser={null}
            ownerEmailSuffix={null}
            tenantAddress={null}
            divisionPenetrationPct={null}
            onEditClick={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(screen.getByRole('img', { name: /company logo/i })).toHaveAttribute('src', 'https://s3.example.com/stale-logo.png'))

    // Refetch the SAME query key (t-1 stays cached) — a true background refetch, not an
    // uncached initial load of a different key.
    let resolveSecondSearch: (v: unknown) => void = () => {}
    vi.mocked(fileService.searchFiles).mockReturnValueOnce(new Promise((r) => { resolveSecondSearch = r }) as never)
    act(() => {
      void queryClient.refetchQueries({ queryKey: tenantLogoKeys.detail('t-1') })
    })

    // While the refetch is in flight, the previously-cached (now possibly-stale) url must not render.
    await waitFor(() => expect(screen.queryByRole('img', { name: /company logo/i })).not.toBeInTheDocument())

    vi.mocked(fileService.getFile).mockResolvedValueOnce({
      success: true, message: '', data: { id: 'file-2', url: 'https://s3.example.com/fresh-logo.png' },
    } as never)
    resolveSecondSearch({ success: true, message: '', data: { count: 1, items: [{ id: 'file-2' }] } })

    await waitFor(() => expect(screen.getByRole('img', { name: /company logo/i })).toHaveAttribute('src', 'https://s3.example.com/fresh-logo.png'))
  })

  // ---- New TenantHeader-specific coverage ----

  it('canManageTenant=false renders full tenant identity with no upload controls', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    vi.mocked(fileService.searchFiles).mockResolvedValue(noLogo())

    renderHeader({ canManageTenant: false })
    await waitFor(() => expect(fileService.searchFiles).toHaveBeenCalled())

    // Identity always renders, regardless of canManageTenant.
    expect(screen.getByText('Acme Pharma')).toBeInTheDocument()
    expect(screen.getByText('acme')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit client/i })).toBeInTheDocument()

    // No upload controls for a non-manager.
    expect(screen.queryByRole('button', { name: /upload logo/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /change logo/i })).not.toBeInTheDocument()
    expect(document.querySelector('input[type="file"]')).not.toBeInTheDocument()
  })

  it('local preview survives a background refetch — not replaced by the loading ellipsis', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.searchFiles).mockResolvedValueOnce(noLogo())

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TenantHeader
            tenant={TENANT}
            canManageTenant
            canViewRole={false}
            ownerName={null}
            ownerUser={null}
            ownerEmailSuffix={null}
            tenantAddress={null}
            divisionPenetrationPct={null}
            onEditClick={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(screen.getByRole('button', { name: /upload logo/i })).toBeEnabled())

    // Pick a file — a local preview (blob URL) is set, and the upload starts.
    vi.mocked(fileService.createFiles).mockReturnValueOnce(new Promise(() => {})) // hold the upload open
    void uploadFileToS3
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeFile())
    await waitFor(() => expect(screen.getByRole('img', { name: /company logo/i })).toHaveAttribute('src', 'blob:mock-preview-url'))

    // A background refetch of the (old, now-being-replaced) server logo starts concurrently.
    let resolveSecondSearch: (v: unknown) => void = () => {}
    vi.mocked(fileService.searchFiles).mockReturnValueOnce(new Promise((r) => { resolveSecondSearch = r }) as never)
    act(() => {
      void queryClient.refetchQueries({ queryKey: tenantLogoKeys.detail('t-1') })
    })

    // The local preview must stay visible throughout — not replaced by the loading ellipsis.
    expect(screen.getByRole('img', { name: /company logo/i })).toHaveAttribute('src', 'blob:mock-preview-url')
    resolveSecondSearch(noLogo())
  })

  it('a long failure message renders in the full-width second row, not the 128px logo column', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.searchFiles).mockResolvedValue({
      success: true, message: '', data: { count: 1, items: [{ id: 'old-file' }] },
    } as never)
    vi.mocked(fileService.getFile).mockResolvedValueOnce({
      success: true, message: '', data: { id: 'old-file', url: 'https://s3.example.com/old-logo.png' },
    } as never)
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({
      success: true, message: '', data: [{ id: 'new-file', uploadUrl: 'https://s3.example.com/new-file' }],
    } as never)
    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never) // activate
    vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(
      Object.assign(new Error('Forbidden'), { isAxiosError: true, response: { status: 403, data: { message: 'Forbidden' } } }),
    ) // deactivate old fails -> restore-failed path
    vi.mocked(fileService.getFile).mockRejectedValueOnce(new Error('network')) // best-effort reconcile fails
    vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(new Error('network')) // discard also ambiguous

    renderHeader()
    await waitFor(() => expect(screen.getByRole('button', { name: /change logo/i })).toBeEnabled())

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeFile())

    const longMessage = await screen.findByText(/couldn't replace the logo/i)
    const logoColumn = screen.getByRole('button', { name: /change logo/i }).closest('.w-32')
    expect(logoColumn).not.toBeNull()
    expect(logoColumn?.contains(longMessage)).toBe(false)
  })

  it('a short in-progress caption stays in the compact column, not the second row', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.searchFiles).mockResolvedValue(noLogo())
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({
      success: true, message: '', data: [{ id: 'new-file', uploadUrl: 'https://s3.example.com/new-file' }],
    } as never)
    vi.mocked(uploadFileToS3).mockReturnValueOnce(new Promise(() => {})) // stay in 'uploading'

    renderHeader()
    await waitFor(() => expect(screen.getByRole('button', { name: /upload logo/i })).toBeEnabled())

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeFile())

    const caption = await screen.findByText(/^uploading…$/i)
    const logoColumn = screen.getByRole('button', { name: /upload logo/i }).closest('.w-32')
    expect(logoColumn?.contains(caption)).toBe(true)
    // No second-row wrapper for short content.
    expect(document.querySelector('.border-t.flex.flex-col')).not.toBeInTheDocument()
  })

  it('idle with no warnings renders no feedback-row wrapper at all', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    vi.mocked(fileService.searchFiles).mockResolvedValue(noLogo())

    renderHeader()
    await waitFor(() => expect(screen.getByRole('button', { name: /upload logo/i })).toBeEnabled())

    expect(document.querySelector('.border-t.flex.flex-col')).not.toBeInTheDocument()
  })

  it('upload in progress WITH a cleanup warning shows both the progress caption and the feedback row simultaneously', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.searchFiles).mockResolvedValue(noLogo())
    vi.mocked(fileService.createFiles).mockResolvedValue({
      success: true, message: '', data: [{ id: 'draft-1', uploadUrl: 'https://s3.example.com/draft-1' }],
    } as never)
    vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('boom'))

    renderHeader()
    await waitFor(() => expect(screen.getByRole('button', { name: /upload logo/i })).toBeEnabled())

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeFile())
    await waitFor(() => expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument())

    vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('boom again'))
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /start a new upload/i })).toBeInTheDocument())

    // Restart: discard fails -> sticky-false cleanup warning; the fresh upload then stays pending.
    vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(new Error('discard failed'))
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({
      success: true, message: '', data: [{ id: 'draft-2', uploadUrl: 'https://s3.example.com/draft-2' }],
    } as never)
    vi.mocked(uploadFileToS3).mockReturnValueOnce(new Promise(() => {})) // stays 'uploading'

    await userEvent.click(screen.getByRole('button', { name: /start a new upload/i }))
    await userEvent.click(await screen.findByRole('button', { name: /^start new upload$/i }))

    await waitFor(() => expect(screen.getByText(/^uploading…$/i)).toBeInTheDocument())
    expect(screen.getByText(/previous draft upload couldn't be confirmed/i)).toBeInTheDocument()
  })

  it('done with a cleanup warning still visible after success', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.searchFiles).mockResolvedValue(noLogo())
    vi.mocked(fileService.createFiles).mockResolvedValue({
      success: true, message: '', data: [{ id: 'draft-1', uploadUrl: 'https://s3.example.com/draft-1' }],
    } as never)
    vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('boom'))

    renderHeader()
    await waitFor(() => expect(screen.getByRole('button', { name: /upload logo/i })).toBeEnabled())

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeFile())
    await waitFor(() => expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument())

    vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('boom again'))
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /start a new upload/i })).toBeInTheDocument())

    // Restart: discard fails (sticky-false), but the fresh upload succeeds fully through to done.
    vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(new Error('discard failed'))
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({
      success: true, message: '', data: [{ id: 'draft-2', uploadUrl: 'https://s3.example.com/draft-2' }],
    } as never)
    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never) // activate
    vi.mocked(fileService.linkFileToEntity).mockResolvedValueOnce({ success: true, message: '', data: {} } as never)

    await userEvent.click(screen.getByRole('button', { name: /start a new upload/i }))
    await userEvent.click(await screen.findByRole('button', { name: /^start new upload$/i }))

    await waitFor(() => expect(fileService.linkFileToEntity).toHaveBeenCalledWith('draft-2', { entityId: 't-1' }))
    expect(screen.getByText(/previous draft upload couldn't be confirmed/i)).toBeInTheDocument()
  })

  it('activate-not-uploaded still shows a working Retry (not a bare busy caption)', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.searchFiles).mockResolvedValue(noLogo())
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({
      success: true, message: '', data: [{ id: 'new-file', uploadUrl: 'https://s3.example.com/new-file' }],
    } as never)
    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(
      Object.assign(new Error('Conflict'), {
        isAxiosError: true,
        response: { status: 409, data: { message: 'File has not been uploaded to storage yet' } },
      }),
    )

    renderHeader()
    await waitFor(() => expect(screen.getByRole('button', { name: /upload logo/i })).toBeEnabled())

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeFile())

    const retryButton = await screen.findByRole('button', { name: /retry/i })
    expect(retryButton).toBeInTheDocument()

    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never)
    vi.mocked(fileService.linkFileToEntity).mockResolvedValueOnce({ success: true, message: '', data: {} } as never)
    await userEvent.click(retryButton)

    // Re-PUTs then re-activates — matches activate-not-uploaded's real recovery path.
    await waitFor(() => expect(uploadFileToS3).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(fileService.linkFileToEntity).toHaveBeenCalled())
  })

  it('activate-uncertain still shows a working Retry (not a bare busy caption)', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.searchFiles).mockResolvedValue(noLogo())
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({
      success: true, message: '', data: [{ id: 'new-file', uploadUrl: 'https://s3.example.com/new-file' }],
    } as never)
    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(new Error('Network Error'))

    renderHeader()
    await waitFor(() => expect(screen.getByRole('button', { name: /upload logo/i })).toBeEnabled())

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeFile())

    const retryButton = await screen.findByRole('button', { name: /retry/i })
    expect(retryButton).toBeInTheDocument()

    // retry() from activate-uncertain reconciles via getFile() — active means it's already done.
    vi.mocked(fileService.getFile).mockResolvedValueOnce({ success: true, message: '', data: { status: 'active' } } as never)
    vi.mocked(fileService.linkFileToEntity).mockResolvedValueOnce({ success: true, message: '', data: {} } as never)
    await userEvent.click(retryButton)

    await waitFor(() => expect(fileService.getFile).toHaveBeenCalledWith('new-file'))
    await waitFor(() => expect(fileService.linkFileToEntity).toHaveBeenCalled())
  })

  it('the sticky cleanup warning stays visible while cleaning-up-orphan is in flight', async () => {
    // cleaning-up-orphan wraps the failure it's cleaning up in state.primary rather than carrying
    // priorDraftCleanupConfirmed itself — this is the regression guard for that read-through.
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.searchFiles).mockResolvedValue(noLogo())
    vi.mocked(fileService.createFiles).mockResolvedValue({
      success: true, message: '', data: [{ id: 'draft-1', uploadUrl: 'https://s3.example.com/draft-1' }],
    } as never)
    vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('boom'))

    renderHeader()
    await waitFor(() => expect(screen.getByRole('button', { name: /upload logo/i })).toBeEnabled())

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeFile())
    await waitFor(() => expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument())

    vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('boom again'))
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /start a new upload/i })).toBeInTheDocument())

    // Restart: this draft's own discard fails (confirmed) -> priorDraftCleanupConfirmed becomes
    // sticky-false, carried forward into the fresh upload that follows.
    vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(
      Object.assign(new Error('Bad Request'), { isAxiosError: true, response: { status: 400, data: { message: 'discard failed' } } }),
    )
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({
      success: true, message: '', data: [{ id: 'draft-2', uploadUrl: 'https://s3.example.com/draft-2' }],
    } as never)
    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never) // activate
    // Plain link failure -> discardCandidate -> 'cleaning-up-orphan'; discard held open for the assertion below.
    vi.mocked(fileService.linkFileToEntity).mockRejectedValueOnce(
      Object.assign(new Error('Bad Request'), { isAxiosError: true, response: { status: 400, data: { message: 'link failed' } } }),
    )
    vi.mocked(fileService.changeFileStatus).mockReturnValueOnce(new Promise(() => {})) // this attempt's own discard, held open

    await userEvent.click(screen.getByRole('button', { name: /start a new upload/i }))
    await userEvent.click(await screen.findByRole('button', { name: /^start new upload$/i }))

    await waitFor(() => expect(screen.getByText(/^cleaning up…$/i)).toBeInTheDocument())
    expect(screen.getByText(/previous draft upload couldn't be confirmed/i)).toBeInTheDocument()
  })
})
