import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { AxiosError } from 'axios'
import { useUploadFile } from './useUploadFile'
import type { UploadFileConfig } from './useUploadFile'

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

const CONFIG: UploadFileConfig = { tenant: 't-1', entityType: 'tenant', entityRelation: 'logo' }

function makeFile(name = 'logo.png') {
  return new File(['x'], name, { type: 'image/png' })
}

function networkError() {
  const err = new AxiosError('Network Error')
  err.response = undefined
  return err
}

function confirmedRejection(status = 400, message = 'Bad Request') {
  const err = new AxiosError(message)
  err.response = { status, data: { message }, statusText: '', headers: {}, config: {} as never }
  return err
}

function notUploadedYet409() {
  return confirmedRejection(409, 'File has not been uploaded to storage yet')
}

function serverError() {
  const err = new AxiosError('Internal Server Error')
  err.response = { status: 500, data: {}, statusText: '', headers: {}, config: {} as never }
  return err
}

const CREATED_FILE = { id: 'file-1', uploadUrl: 'https://s3.example.com/file-1?sig=abc' }

describe('useUploadFile', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('happy path: create -> upload -> activate -> done, exposes the created (now-active, unlinked) file id', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.createFiles).mockResolvedValue({ success: true, message: '', data: [CREATED_FILE] } as never)
    vi.mocked(uploadFileToS3).mockResolvedValue(undefined)
    vi.mocked(fileService.changeFileStatus).mockResolvedValue({ success: true, message: '', data: {} } as never)

    const { result } = renderHook(() => useUploadFile())
    const file = makeFile()

    await act(async () => {
      await result.current.start(file, CONFIG)
    })

    expect(result.current.state).toEqual({ step: 'done', fileId: 'file-1', priorDraftCleanupConfirmed: null })
    expect(fileService.createFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant: 't-1',
        entityType: 'tenant',
        entityRelation: 'logo',
        files: [{ fileName: 'logo.png', fileSize: file.size, fileType: 'image/png' }],
      }),
    )
    // entityId must never be sent by this hook — linking is a caller-side concern.
    expect(fileService.createFiles).toHaveBeenCalledWith(expect.not.objectContaining({ entityId: expect.anything() }))
    expect(uploadFileToS3).toHaveBeenCalledWith(CREATED_FILE.uploadUrl, file)
    expect(fileService.changeFileStatus).toHaveBeenCalledWith('file-1', { status: 'active' })
  })

  it('create-failed (4xx): retry() re-POSTs cleanly from scratch', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    vi.mocked(fileService.createFiles).mockRejectedValueOnce(confirmedRejection())

    const { result } = renderHook(() => useUploadFile())
    const file = makeFile()

    await act(async () => {
      await expect(result.current.start(file, CONFIG)).rejects.toThrow()
    })
    expect(result.current.state.step).toBe('create-failed')

    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [CREATED_FILE] } as never)
    vi.mocked(uploadFileToS3).mockResolvedValue(undefined)
    vi.mocked(fileService.changeFileStatus).mockResolvedValue({ success: true, message: '', data: {} } as never)

    await act(async () => {
      await result.current.retry()
    })

    expect(fileService.createFiles).toHaveBeenCalledTimes(2)
    expect(result.current.state).toEqual({ step: 'done', fileId: 'file-1', priorDraftCleanupConfirmed: null })
  })

  it('create-uncertain (network error): retry() re-POSTs anyway (an extra orphan draft is an accepted bounded cost)', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    vi.mocked(fileService.createFiles).mockRejectedValueOnce(networkError())

    const { result } = renderHook(() => useUploadFile())
    const file = makeFile()

    await act(async () => {
      await expect(result.current.start(file, CONFIG)).rejects.toThrow()
    })
    expect(result.current.state.step).toBe('create-uncertain')

    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [CREATED_FILE] } as never)
    vi.mocked(uploadFileToS3).mockResolvedValue(undefined)
    vi.mocked(fileService.changeFileStatus).mockResolvedValue({ success: true, message: '', data: {} } as never)

    await act(async () => {
      await result.current.retry()
    })

    expect(fileService.createFiles).toHaveBeenCalledTimes(2)
    expect(result.current.state.step).toBe('done')
  })

  it('a 5xx on create is treated the same as a network error (create-uncertain), never create-failed', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    vi.mocked(fileService.createFiles).mockRejectedValueOnce(serverError())

    const { result } = renderHook(() => useUploadFile())

    await act(async () => {
      await expect(result.current.start(makeFile(), CONFIG)).rejects.toThrow()
    })

    expect(result.current.state.step).toBe('create-uncertain')
  })

  it('upload-failed: retry() re-PUTs the SAME uploadUrl, and never auto-falls back to create() even on a 403', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [CREATED_FILE] } as never)
    const forbidden = confirmedRejection(403, 'Forbidden')
    vi.mocked(uploadFileToS3).mockRejectedValueOnce(forbidden)

    const { result } = renderHook(() => useUploadFile())

    await act(async () => {
      await expect(result.current.start(makeFile(), CONFIG)).rejects.toThrow()
    })
    expect(result.current.state.step).toBe('upload-failed')
    expect(fileService.createFiles).toHaveBeenCalledTimes(1)

    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    vi.mocked(fileService.changeFileStatus).mockResolvedValue({ success: true, message: '', data: {} } as never)

    await act(async () => {
      await result.current.retry()
    })

    // Same uploadUrl, no second create() call — a 403 must never trigger an automatic fresh draft.
    expect(uploadFileToS3).toHaveBeenLastCalledWith(CREATED_FILE.uploadUrl, expect.any(File))
    expect(fileService.createFiles).toHaveBeenCalledTimes(1)
    expect(result.current.state.step).toBe('done')
  })

  it('activate 409 "File has not been uploaded to storage yet": retry() re-PUTs THEN re-activates (not a bare activate retry)', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [CREATED_FILE] } as never)
    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(notUploadedYet409())

    const { result } = renderHook(() => useUploadFile())

    await act(async () => {
      await expect(result.current.start(makeFile(), CONFIG)).rejects.toThrow()
    })
    expect(result.current.state.step).toBe('activate-not-uploaded')
    expect(uploadFileToS3).toHaveBeenCalledTimes(1)

    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never)

    await act(async () => {
      await result.current.retry()
    })

    // Both the S3 PUT and activate ran again — a bare activate-only retry would just 409 identically.
    expect(uploadFileToS3).toHaveBeenCalledTimes(2)
    expect(fileService.changeFileStatus).toHaveBeenCalledTimes(2)
    expect(result.current.state).toEqual({ step: 'done', fileId: 'file-1', priorDraftCleanupConfirmed: null })
  })

  it('activate-uncertain (network error) reconciles via getFile() before deciding: still draft -> re-activate', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [CREATED_FILE] } as never)
    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(networkError())

    const { result } = renderHook(() => useUploadFile())

    await act(async () => {
      await expect(result.current.start(makeFile(), CONFIG)).rejects.toThrow()
    })
    expect(result.current.state.step).toBe('activate-uncertain')

    vi.mocked(fileService.getFile).mockResolvedValueOnce({ success: true, message: '', data: { status: 'draft' } } as never)
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never)

    await act(async () => {
      await result.current.retry()
    })

    expect(fileService.getFile).toHaveBeenCalledWith('file-1')
    expect(fileService.changeFileStatus).toHaveBeenCalledTimes(2)
    expect(result.current.state).toEqual({ step: 'done', fileId: 'file-1', priorDraftCleanupConfirmed: null })
  })

  it('activate-uncertain reconciles via getFile(): already active -> done without re-activating', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [CREATED_FILE] } as never)
    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(networkError())

    const { result } = renderHook(() => useUploadFile())

    await act(async () => {
      await expect(result.current.start(makeFile(), CONFIG)).rejects.toThrow()
    })

    vi.mocked(fileService.getFile).mockResolvedValueOnce({ success: true, message: '', data: { status: 'active' } } as never)

    await act(async () => {
      await result.current.retry()
    })

    expect(fileService.changeFileStatus).toHaveBeenCalledTimes(1) // no second activate call
    expect(result.current.state).toEqual({ step: 'done', fileId: 'file-1', priorDraftCleanupConfirmed: null })
  })

  it('a generic activate 4xx falls straight through to activate-failed with no special cap-conflict recognition', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [CREATED_FILE] } as never)
    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    // A cap-shaped message deliberately, to prove this hook does not branch on it specially.
    vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(
      confirmedRejection(409, 'already holds 1 of 1 active file(s)'),
    )

    const { result } = renderHook(() => useUploadFile())

    await act(async () => {
      await expect(result.current.start(makeFile(), CONFIG)).rejects.toThrow()
    })

    // No dedicated cap-conflict variant exists — falls through to plain activate-failed.
    expect(result.current.state.step).toBe('activate-failed')
    if (result.current.state.step === 'activate-failed') {
      expect(result.current.state.error).toBeDefined()
    }
  })

  it('a stale run\'s late activate resolution never stomps a NEWER run\'s state (no cancellation exists, so this must be guarded)', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    const FILE_A = { id: 'file-a', uploadUrl: 'https://s3.example.com/file-a?sig=a' }
    const FILE_B = { id: 'file-b', uploadUrl: 'https://s3.example.com/file-b?sig=b' }

    // Run A's activate call is held open — simulates a genuinely hung/slow request that the
    // caller has already moved on from (e.g. via an abandon action) by the time it resolves.
    let resolveActivateA: (() => void) | undefined
    const activateAPending = new Promise<void>((resolve) => {
      resolveActivateA = () => resolve()
    })

    vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [FILE_A] } as never)
    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    vi.mocked(fileService.changeFileStatus).mockImplementationOnce(() => activateAPending.then(() => ({ success: true, message: '', data: {} }) as never))

    const { result } = renderHook(() => useUploadFile())

    act(() => {
      void result.current.start(makeFile('a.png'), CONFIG)
    })
    await vi.waitFor(() => expect(result.current.state.step).toBe('activating'))

    // Caller moves on to a second run (e.g. after abandoning run A) before run A's activate call
    // has resolved at all — this is the reachable state a "continue without waiting" escape leaves
    // useUploadFile in, since no request is actually cancelled.
    vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [FILE_B] } as never)
    vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never)

    await act(async () => {
      await result.current.start(makeFile('b.png'), CONFIG)
    })
    expect(result.current.state).toEqual({ step: 'done', fileId: 'file-b', priorDraftCleanupConfirmed: null })

    // Run A's activate call finally resolves — must NOT overwrite run B's already-settled state.
    await act(async () => {
      resolveActivateA?.()
      await activateAPending
    })
    expect(result.current.state).toEqual({ step: 'done', fileId: 'file-b', priorDraftCleanupConfirmed: null })
  })

  describe('startOver()', () => {
    it('is only meaningful from upload-failed (no-op otherwise)', async () => {
      const { fileService } = await import('@/lib/file/file.service')
      const { result } = renderHook(() => useUploadFile())

      await act(async () => {
        await result.current.startOver()
      })

      expect(result.current.state).toEqual({ step: 'idle' })
      expect(fileService.changeFileStatus).not.toHaveBeenCalled()
      expect(fileService.createFiles).not.toHaveBeenCalled()
    })

    async function reachUploadFailed() {
      const { fileService } = await import('@/lib/file/file.service')
      const { uploadFileToS3 } = await import('@/lib/file/file.upload')
      vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [CREATED_FILE] } as never)
      vi.mocked(uploadFileToS3).mockRejectedValueOnce(networkError())

      const { result } = renderHook(() => useUploadFile())
      await act(async () => {
        await expect(result.current.start(makeFile(), CONFIG)).rejects.toThrow()
      })
      expect(result.current.state.step).toBe('upload-failed')
      return { result, fileService, uploadFileToS3 }
    }

    it('discard succeeds -> calls changeFileStatus(discarded), then proceeds to a fresh create(); priorDraftCleanupConfirmed is true', async () => {
      const { result, fileService, uploadFileToS3 } = await reachUploadFailed()

      vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never)
      const SECOND_FILE = { id: 'file-2', uploadUrl: 'https://s3.example.com/file-2?sig=def' }
      vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [SECOND_FILE] } as never)
      vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
      vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never)

      await act(async () => {
        await result.current.startOver()
      })

      expect(fileService.changeFileStatus).toHaveBeenCalledWith('file-1', { status: 'discarded' })
      // A genuinely different code path from retry(): create() is called again (retry() from
      // upload-failed never calls create()).
      expect(fileService.createFiles).toHaveBeenCalledTimes(2)
      expect(result.current.state).toEqual({ step: 'done', fileId: 'file-2', priorDraftCleanupConfirmed: true })
    })

    it('discard confirmed-fails (4xx) -> still proceeds to a fresh create(); priorDraftCleanupConfirmed is false', async () => {
      const { result, fileService, uploadFileToS3 } = await reachUploadFailed()

      vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(confirmedRejection())
      const SECOND_FILE = { id: 'file-2', uploadUrl: 'https://s3.example.com/file-2?sig=def' }
      vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [SECOND_FILE] } as never)
      vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
      vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never)

      await act(async () => {
        await result.current.startOver()
      })

      expect(fileService.changeFileStatus).toHaveBeenCalledWith('file-1', { status: 'discarded' })
      expect(fileService.createFiles).toHaveBeenCalledTimes(2)
      expect(result.current.state).toEqual({ step: 'done', fileId: 'file-2', priorDraftCleanupConfirmed: false })
    })

    it('discard network-fails -> still proceeds to a fresh create(); priorDraftCleanupConfirmed is false', async () => {
      const { result, fileService, uploadFileToS3 } = await reachUploadFailed()

      vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(networkError())
      const SECOND_FILE = { id: 'file-2', uploadUrl: 'https://s3.example.com/file-2?sig=def' }
      vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [SECOND_FILE] } as never)
      vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
      vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never)

      await act(async () => {
        await result.current.startOver()
      })

      expect(fileService.changeFileStatus).toHaveBeenCalledWith('file-1', { status: 'discarded' })
      expect(fileService.createFiles).toHaveBeenCalledTimes(2)
      expect(result.current.state).toEqual({ step: 'done', fileId: 'file-2', priorDraftCleanupConfirmed: false })
    })

    it('re-uses the exact original file/config passed to start(), not fresh args', async () => {
      const { result, fileService, uploadFileToS3 } = await reachUploadFailed()

      vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never)
      const SECOND_FILE = { id: 'file-2', uploadUrl: 'https://s3.example.com/file-2?sig=def' }
      vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [SECOND_FILE] } as never)
      vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
      vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce({ success: true, message: '', data: {} } as never)

      await act(async () => {
        await result.current.startOver()
      })

      expect(fileService.createFiles).toHaveBeenLastCalledWith(
        expect.objectContaining({ tenant: 't-1', entityType: 'tenant', entityRelation: 'logo' }),
      )
    })
  })
})
