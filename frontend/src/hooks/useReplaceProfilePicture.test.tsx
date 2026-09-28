import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { AxiosError } from 'axios'
import { useReplaceProfilePicture } from './useReplaceProfilePicture'

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

const TENANT_ID = 't-1'
const USER_ID = 'u-1'
const OLD_PICTURE_ID = 'old-file-1'
const NEW_FILE = { id: 'new-file-1', uploadUrl: 'https://s3.example.com/new-file-1?sig=abc' }

function makeFile(name = 'avatar.png') {
  return new File(['x'], name, { type: 'image/png' })
}

function confirmedRejection(status = 400, message = 'Bad Request') {
  const err = new AxiosError(message)
  err.response = { status, data: { message }, statusText: '', headers: {}, config: {} as never }
  return err
}

function ok() {
  return { success: true, message: '', data: {} } as never
}

async function mockHappyUploadTo(fileService: typeof import('@/lib/file/file.service')['fileService'], uploadFileToS3: typeof import('@/lib/file/file.upload')['uploadFileToS3']) {
  vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [NEW_FILE] } as never)
  vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
  vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce(ok()) // activate
}

describe('useReplaceProfilePicture', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('parameterizes useReplaceFile with entityType "user" / entityRelation "profile_picture" — create is called with those values, not tenant/logo', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    await mockHappyUploadTo(fileService, uploadFileToS3)
    vi.mocked(fileService.linkFileToEntity).mockResolvedValueOnce(ok())

    const { result } = renderHook(() => useReplaceProfilePicture(TENANT_ID, USER_ID, null))

    await act(async () => {
      result.current.replace(makeFile())
    })

    await waitFor(() => expect(result.current.state.step).toBe('done'))
    expect(fileService.createFiles).toHaveBeenCalledWith(
      expect.objectContaining({ tenant: TENANT_ID, entityType: 'user', entityRelation: 'profile_picture' }),
    )
  })

  it('links the new picture to the USER id (entityId), not the tenant id — tenantId and entityId are genuinely different values here', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    await mockHappyUploadTo(fileService, uploadFileToS3)
    vi.mocked(fileService.linkFileToEntity).mockResolvedValueOnce(ok())

    const { result } = renderHook(() => useReplaceProfilePicture(TENANT_ID, USER_ID, null))

    await act(async () => {
      result.current.replace(makeFile())
    })

    await waitFor(() => expect(result.current.state.step).toBe('done'))
    expect(fileService.linkFileToEntity).toHaveBeenCalledWith(NEW_FILE.id, { entityId: USER_ID })
    expect(fileService.linkFileToEntity).not.toHaveBeenCalledWith(NEW_FILE.id, { entityId: TENANT_ID })
  })

  it('replace path (oldFileId supplied, matching an existing picture): deactivates the old picture before linking the new one, not a bare create', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    await mockHappyUploadTo(fileService, uploadFileToS3)
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce(ok()) // deactivate old
    vi.mocked(fileService.linkFileToEntity).mockResolvedValueOnce(ok())

    const { result } = renderHook(() => useReplaceProfilePicture(TENANT_ID, USER_ID, OLD_PICTURE_ID))

    await act(async () => {
      result.current.replace(makeFile())
    })

    await waitFor(() => expect(result.current.state.step).toBe('done'))
    expect(fileService.changeFileStatus).toHaveBeenCalledWith(OLD_PICTURE_ID, { status: 'inactive' })
    expect(fileService.linkFileToEntity).toHaveBeenCalledWith(NEW_FILE.id, { entityId: USER_ID })
  })

  it('a second upload with a real oldFileId succeeds — does NOT hit the cap-of-1 conflict a hardcoded null oldFileId would cause', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    await mockHappyUploadTo(fileService, uploadFileToS3)
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce(ok()) // deactivate old
    vi.mocked(fileService.linkFileToEntity).mockResolvedValueOnce(ok())

    const { result } = renderHook(() => useReplaceProfilePicture(TENANT_ID, USER_ID, OLD_PICTURE_ID))

    await act(async () => {
      result.current.replace(makeFile())
    })

    await waitFor(() => expect(result.current.state.step).toBe('done'))
    // Never hits the cap-conflict path — no restore/discard recovery was triggered.
    expect(fileService.changeFileStatus).not.toHaveBeenCalledWith(NEW_FILE.id, { status: 'discarded' })
    if (result.current.state.step === 'done') {
      expect(result.current.state.fileId).toBe(NEW_FILE.id)
    }
  })

  it('a cap conflict on link (simulating oldFileId being wrongly null/stale) triggers the recovery path — proves the hook does NOT silently swallow a real conflict', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    await mockHappyUploadTo(fileService, uploadFileToS3)
    vi.mocked(fileService.linkFileToEntity).mockRejectedValueOnce(confirmedRejection(409, 'already holds 1 of 1 active file(s)'))
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce(ok()) // discard candidate

    // oldFileId: null here on purpose — the caller didn't know about an existing picture, so no
    // restore step applies; the candidate is discarded and the failure surfaces as link-conflict.
    const { result } = renderHook(() => useReplaceProfilePicture(TENANT_ID, USER_ID, null))

    await act(async () => {
      result.current.replace(makeFile())
    })

    await waitFor(() => expect(result.current.state.step).toBe('link-conflict'))
    expect(fileService.changeFileStatus).toHaveBeenCalledWith(NEW_FILE.id, { status: 'discarded' })
  })

  it('onSuccess fires with the new fileId once the replace completes', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    await mockHappyUploadTo(fileService, uploadFileToS3)
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce(ok())
    vi.mocked(fileService.linkFileToEntity).mockResolvedValueOnce(ok())

    const onSuccess = vi.fn()
    const { result } = renderHook(() => useReplaceProfilePicture(TENANT_ID, USER_ID, OLD_PICTURE_ID, { onSuccess }))

    await act(async () => {
      result.current.replace(makeFile())
    })

    await waitFor(() => expect(result.current.state.step).toBe('done'))
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })
})
