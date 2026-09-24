import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MyProfileModal from './MyProfileModal'
import type { AuthUser } from '@/types/auth.types'
import type { SessionResponse } from '@/types/accessManagement.types'

vi.mock('@/lib/file/file.service', () => ({
  fileService: {
    createFiles: vi.fn(),
    linkFileToEntity: vi.fn(),
    changeFileStatus: vi.fn(),
    getFile: vi.fn(),
    searchFiles: vi.fn(),
  },
}))

vi.mock('@/lib/file/file.upload', () => ({
  uploadFileToS3: vi.fn(),
}))

beforeEach(() => {
  window.URL.createObjectURL = vi.fn(() => 'blob:mock-preview-url')
  window.URL.revokeObjectURL = vi.fn()
})

const USER: AuthUser = {
  id: 'u-1',
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
}

const SESSION: SessionResponse = {
  user: { id: 'u-1', email: 'jane@example.com', firstName: 'Jane', lastName: 'Doe' } as never,
  role: {} as never,
  roleType: { name: 'Sales Rep' } as never,
  tenant: { id: 't-1', code: 'acme', name: 'Acme Pharma', type: 'customer' },
  permissions: [],
}

function renderModal(props: Partial<{ user: AuthUser | null; session: SessionResponse | null }> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MyProfileModal user={USER} session={SESSION} onClose={vi.fn()} {...props} />
    </QueryClientProvider>,
  )
}

function noPicture() {
  return { success: true, message: '', data: { count: 0, items: [] } } as never
}

function makeFile(name = 'avatar.png', type = 'image/png', size = 1024) {
  return new File(['x'.repeat(size)], name, { type })
}

describe('MyProfileModal', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-preview-url')
    window.URL.revokeObjectURL = vi.fn()
  })

  it('regression: does not crash when session.tenant is null — renders the initials fallback instead of throwing', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    vi.mocked(fileService.searchFiles).mockResolvedValue(noPicture())

    const sessionWithNullTenant = { ...SESSION, tenant: null } as unknown as SessionResponse

    expect(() => renderModal({ session: sessionWithNullTenant })).not.toThrow()
    await waitFor(() => expect(screen.getByText('My Profile')).toBeInTheDocument())
    // No upload trigger — tenant id is unknown, so canManage is false and only the static
    // initials badge renders (no "Upload picture" button reachable without a tenant id).
    expect(screen.queryByRole('button', { name: /upload picture/i })).not.toBeInTheDocument()
    expect(screen.getByText('JD')).toBeInTheDocument()
  })

  it('regression: does not crash when user is null — unconditional hook calls with safe fallback ids', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    vi.mocked(fileService.searchFiles).mockResolvedValue(noPicture())

    expect(() => renderModal({ user: null })).not.toThrow()
    await waitFor(() => expect(screen.getByText('My Profile')).toBeInTheDocument())
    expect(screen.getByText('U')).toBeInTheDocument() // getInitials() fallback for no user
  })

  it('renders only the upload column (not a redundant separate initials badge) once real ids are known, even with no picture yet', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    vi.mocked(fileService.searchFiles).mockResolvedValue(noPicture())

    renderModal()

    await waitFor(() => expect(screen.getByRole('button', { name: /upload picture/i })).toBeEnabled())
    // No competing static initials badge once canManagePicture is true — LogoPreview's own
    // placeholder icon is the only "no picture yet" indicator, not a second stacked avatar box.
    expect(screen.queryByText('JD')).not.toBeInTheDocument()
    // Exactly one avatar-shaped box (the upload column's own preview), not two.
    expect(document.querySelectorAll('input[type="file"]')).toHaveLength(1)
  })

  it('falls back to the plain initials badge only while real ids are not yet known', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    vi.mocked(fileService.searchFiles).mockResolvedValue(noPicture())

    // session.tenant missing -> canManagePicture is false -> no upload column can render.
    renderModal({ session: { ...SESSION, tenant: null } as unknown as SessionResponse })

    await waitFor(() => expect(screen.getByText('My Profile')).toBeInTheDocument())
    expect(screen.getByText('JD')).toBeInTheDocument()
    expect(document.querySelectorAll('input[type="file"]')).toHaveLength(0)
  })

  it('renders the real picture (not initials) once an active picture exists', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    vi.mocked(fileService.searchFiles).mockResolvedValue({
      success: true, message: '', data: { count: 1, items: [{ id: 'file-1' }] },
    } as never)
    vi.mocked(fileService.getFile).mockResolvedValue({
      success: true, message: '', data: { id: 'file-1', url: 'https://s3.example.com/avatar.png' },
    } as never)

    renderModal()

    await waitFor(() => expect(screen.getByRole('img', { name: /profile picture/i })).toHaveAttribute('src', 'https://s3.example.com/avatar.png'))
    expect(screen.queryByText('JD')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /change picture/i })).toBeEnabled()
  })

  it('picking a valid file starts a replace — createFiles is called with entityType user / entityRelation profile_picture', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.searchFiles).mockResolvedValue(noPicture())
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({
      success: true, message: '', data: [{ id: 'new-file', uploadUrl: 'https://s3.example.com/new-file' }],
    } as never)
    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never)
    vi.mocked(fileService.linkFileToEntity).mockResolvedValueOnce({ success: true, message: '', data: {} } as never)

    renderModal()
    await waitFor(() => expect(screen.getByRole('button', { name: /upload picture/i })).toBeEnabled())

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeFile())

    await waitFor(() =>
      expect(fileService.createFiles).toHaveBeenCalledWith(
        expect.objectContaining({ tenant: 't-1', entityType: 'user', entityRelation: 'profile_picture' }),
      ),
    )
    await waitFor(() => expect(fileService.linkFileToEntity).toHaveBeenCalledWith('new-file', { entityId: 'u-1' }))
  })

  it('rejects an oversized file before ever calling createFiles, and shows the validation message', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    vi.mocked(fileService.searchFiles).mockResolvedValue(noPicture())

    renderModal()
    await waitFor(() => expect(screen.getByRole('button', { name: /upload picture/i })).toBeEnabled())

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const oversized = makeFile('big.png', 'image/png', 6 * 1024 * 1024)
    await userEvent.upload(input, oversized)

    await waitFor(() => expect(screen.getByText(/5mb or smaller/i)).toBeInTheDocument())
    expect(fileService.createFiles).not.toHaveBeenCalled()
  })

  it('still displays the disabled fields (Full Name, Email, Role, Company) unaffected by the picture UI', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    vi.mocked(fileService.searchFiles).mockResolvedValue(noPicture())

    renderModal()
    await waitFor(() => expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument())
    expect(screen.getByDisplayValue('jane@example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Sales Rep')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Acme Pharma')).toBeInTheDocument()
  })

  it('link-conflict copy is profile-specific ("for your profile", not a bare "for this" with no referent)', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.searchFiles).mockResolvedValue(noPicture())
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({
      success: true, message: '', data: [{ id: 'new-file', uploadUrl: 'https://s3.example.com/new-file' }],
    } as never)
    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never) // activate
    vi.mocked(fileService.linkFileToEntity).mockRejectedValueOnce(
      Object.assign(new Error('accepts at most 1 file(s)'), {
        isAxiosError: true,
        response: { status: 400, data: { message: 'accepts at most 1 file(s)' } },
      }),
    )
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never) // discard candidate

    renderModal()
    await waitFor(() => expect(screen.getByRole('button', { name: /upload picture/i })).toBeEnabled())

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeFile())

    await waitFor(() => expect(screen.getByText('Another picture was just activated for your profile.')).toBeInTheDocument())
  })

  it('restore-failed copy never suggests a "manual fix" — no admin-override path exists for a profile picture', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.searchFiles).mockResolvedValue({
      success: true, message: '', data: { count: 1, items: [{ id: 'old-file' }] },
    } as never)
    vi.mocked(fileService.getFile).mockResolvedValueOnce({
      success: true, message: '', data: { id: 'old-file', url: 'https://s3.example.com/old-avatar.png' },
    } as never)
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({
      success: true, message: '', data: [{ id: 'new-file', uploadUrl: 'https://s3.example.com/new-file' }],
    } as never)
    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never) // activate
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never) // deactivate old succeeds
    vi.mocked(fileService.linkFileToEntity).mockRejectedValueOnce(
      Object.assign(new Error('already holds 1 of 1 active file(s)'), {
        isAxiosError: true,
        response: { status: 409, data: { message: 'already holds 1 of 1 active file(s)' } },
      }),
    ) // cap conflict on link
    vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(
      Object.assign(new Error('Cannot move a file'), {
        isAxiosError: true,
        response: { status: 400, data: { message: 'Cannot move a file' } },
      }),
    ) // restore old -> active fails, confirmed

    renderModal()
    await waitFor(() => expect(screen.getByRole('button', { name: /change picture/i })).toBeEnabled())

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, makeFile())

    await waitFor(() => expect(screen.getByText(/couldn't restore your previous picture/i)).toBeInTheDocument())
    expect(screen.queryByText(/manual fix/i)).not.toBeInTheDocument()
  })
})
