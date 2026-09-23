import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { AxiosError } from 'axios'
import { useReplaceTenantLogo } from './useReplaceTenantLogo'

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

const TENANT_ID = 't-1'
const OLD_LOGO_ID = 'old-file-1'
const NEW_FILE = { id: 'new-file-1', uploadUrl: 'https://s3.example.com/new-file-1?sig=abc' }

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

function ok() {
  return { success: true, message: '', data: {} } as never
}

async function mockHappyUploadTo(fileService: typeof import('@/lib/file/file.service')['fileService'], uploadFileToS3: typeof import('@/lib/file/file.upload')['uploadFileToS3']) {
  vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [NEW_FILE] } as never)
  vi.mocked(uploadFileToS3).mockResolvedValueOnce(undefined)
  vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce(ok()) // activate
}

async function runReplaceUntilUploadDone(oldLogoId: string | null, onSuccess?: () => void) {
  const { fileService } = await import('@/lib/file/file.service')
  const { uploadFileToS3 } = await import('@/lib/file/file.upload')
  await mockHappyUploadTo(fileService, uploadFileToS3)

  const { result } = renderHook(() => useReplaceTenantLogo(TENANT_ID, oldLogoId, { onSuccess }))

  await act(async () => {
    result.current.replace(makeFile())
  })
  await waitFor(() => expect(result.current.state.step).not.toBe('uploading'))

  return { result, fileService }
}

describe('useReplaceTenantLogo', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('happy path with an old logo: deactivate (via exact no-op message) -> link -> done, onSuccess fires', async () => {
    const onSuccess = vi.fn()
    const { result, fileService } = await runReplaceUntilUploadDone(OLD_LOGO_ID, onSuccess)

    expect(result.current.state.step).toBe('done')
    if (result.current.state.step === 'done') {
      expect(result.current.state.fileId).toBe(NEW_FILE.id)
    }
    expect(fileService.linkFileToEntity).toHaveBeenCalledWith(NEW_FILE.id, { entityId: TENANT_ID })
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('deactivate succeeds via the exact-message no-op case -> link succeeds -> done', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    await mockHappyUploadTo(fileService, uploadFileToS3)

    const { result } = renderHook(() => useReplaceTenantLogo(TENANT_ID, OLD_LOGO_ID))

    // deactivate rejects with the exact "already inactive" 409 -> treated as a safe no-op
    vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(confirmedRejection(409, 'File is already "inactive"'))
    vi.mocked(fileService.linkFileToEntity).mockResolvedValueOnce(ok())

    await act(async () => {
      result.current.replace(makeFile())
    })

    await waitFor(() => expect(result.current.state.step).toBe('done'))
    expect(fileService.changeFileStatus).toHaveBeenCalledWith(OLD_LOGO_ID, { status: 'inactive' })
    expect(fileService.linkFileToEntity).toHaveBeenCalledWith(NEW_FILE.id, { entityId: TENANT_ID })
    expect(fileService.getFile).not.toHaveBeenCalled() // no reconciliation needed for the safe no-op
  })

  it('deactivate ambiguous (network error) reconciles via getFile: confirmed inactive -> proceeds to link -> done', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    await mockHappyUploadTo(fileService, uploadFileToS3)

    const { result } = renderHook(() => useReplaceTenantLogo(TENANT_ID, OLD_LOGO_ID))

    vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(networkError())
    vi.mocked(fileService.getFile).mockResolvedValueOnce({ success: true, message: '', data: { status: 'inactive' } } as never)
    vi.mocked(fileService.linkFileToEntity).mockResolvedValueOnce(ok())

    await act(async () => {
      result.current.replace(makeFile())
    })

    await waitFor(() => expect(result.current.state.step).toBe('done'))
    expect(fileService.getFile).toHaveBeenCalledWith(OLD_LOGO_ID)
  })

  it('deactivate ambiguous reconciles to still-draft/active (not inactive) -> stays deactivate-uncertain (retryable)', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    await mockHappyUploadTo(fileService, uploadFileToS3)

    const { result } = renderHook(() => useReplaceTenantLogo(TENANT_ID, OLD_LOGO_ID))

    vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(networkError())
    vi.mocked(fileService.getFile).mockResolvedValueOnce({ success: true, message: '', data: { status: 'active' } } as never)

    await act(async () => {
      result.current.replace(makeFile())
    })

    await waitFor(() => expect(result.current.state.step).toBe('deactivate-uncertain'))
    expect(fileService.linkFileToEntity).not.toHaveBeenCalled()
  })

  it('an unrelated confirmed 4xx on deactivate does NOT attempt restore, DOES reconcile via getFile, shows exact wording, and discards the candidate', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    await mockHappyUploadTo(fileService, uploadFileToS3)

    const { result } = renderHook(() => useReplaceTenantLogo(TENANT_ID, OLD_LOGO_ID))

    vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(confirmedRejection(403, 'Forbidden'))
    vi.mocked(fileService.getFile).mockResolvedValueOnce({ success: true, message: '', data: { status: 'active' } } as never)
    // discard call for the orphaned candidate
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce(ok())

    await act(async () => {
      result.current.replace(makeFile())
    })

    await waitFor(() => expect(result.current.state.step).toBe('deactivate-failed'))
    if (result.current.state.step === 'deactivate-failed') {
      expect(result.current.state.error).toBeDefined()
      expect(result.current.state.cleanup).toBeUndefined() // discard succeeded
    }
    // Reconciliation getFile was called on the OLD logo, not a restore call.
    expect(fileService.getFile).toHaveBeenCalledWith(OLD_LOGO_ID)
    // No restore attempted: changeFileStatus was never called with {status:'active'} on the old logo.
    expect(fileService.changeFileStatus).not.toHaveBeenCalledWith(OLD_LOGO_ID, { status: 'active' })
    // The candidate WAS discarded.
    expect(fileService.changeFileStatus).toHaveBeenCalledWith(NEW_FILE.id, { status: 'discarded' })
    expect(fileService.linkFileToEntity).not.toHaveBeenCalled()
  })

  it('retry() from deactivate-failed does NOT re-deactivate/re-link — the candidate was already discarded', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    await mockHappyUploadTo(fileService, uploadFileToS3)

    const { result } = renderHook(() => useReplaceTenantLogo(TENANT_ID, OLD_LOGO_ID))

    vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(confirmedRejection(403, 'Forbidden'))
    vi.mocked(fileService.getFile).mockResolvedValueOnce({ success: true, message: '', data: { status: 'active' } } as never)
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce(ok()) // discard succeeds

    await act(async () => {
      result.current.replace(makeFile())
    })
    await waitFor(() => expect(result.current.state.step).toBe('deactivate-failed'))
    // activate (from mockHappyUploadTo) + deactivate attempt + discard = 3.
    expect(fileService.changeFileStatus).toHaveBeenCalledTimes(3)
    expect(fileService.changeFileStatus).toHaveBeenCalledWith(NEW_FILE.id, { status: 'discarded' })

    await act(async () => {
      await result.current.retry()
    })

    // retry()'s switch deliberately excludes deactivate-failed — no further deactivate or link call.
    expect(fileService.changeFileStatus).toHaveBeenCalledTimes(3)
    expect(fileService.linkFileToEntity).not.toHaveBeenCalled()
    expect(result.current.state.step).toBe('deactivate-failed')
  })

  describe('link conflict recovery (cap conflict) — both message variants trigger restore + discard regardless of restore outcome', () => {
    async function setupToLinkStep() {
      const { fileService } = await import('@/lib/file/file.service')
      const { uploadFileToS3 } = await import('@/lib/file/file.upload')
      await mockHappyUploadTo(fileService, uploadFileToS3)
      const { result } = renderHook(() => useReplaceTenantLogo(TENANT_ID, OLD_LOGO_ID))
      // deactivate succeeds cleanly
      vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce(ok())
      return { result, fileService }
    }

    it('400 "accepts at most N file(s)" -> restore succeeds -> discard candidate, surfaces link-failed (restore outcome doesn\'t change surfaced error)', async () => {
      const { result, fileService } = await setupToLinkStep()
      vi.mocked(fileService.linkFileToEntity).mockRejectedValueOnce(confirmedRejection(400, 'accepts at most 1 file(s)'))
      vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce(ok()) // restore succeeds
      vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce(ok()) // discard succeeds

      await act(async () => {
        result.current.replace(makeFile())
      })

      await waitFor(() => expect(result.current.state.step).toBe('link-failed'))
      expect(fileService.changeFileStatus).toHaveBeenCalledWith(OLD_LOGO_ID, { status: 'active' })
      expect(fileService.changeFileStatus).toHaveBeenCalledWith(NEW_FILE.id, { status: 'discarded' })
    })

    it('409 "already holds N of M active file(s)" -> restore confirmed-fails -> surfaces restore-failed, STILL discards candidate', async () => {
      const { result, fileService } = await setupToLinkStep()
      vi.mocked(fileService.linkFileToEntity).mockRejectedValueOnce(confirmedRejection(409, 'already holds 1 of 1 active file(s)'))
      vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(confirmedRejection(400, 'Cannot move a file from "discarded" to "active"')) // restore fails
      vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce(ok()) // discard succeeds

      await act(async () => {
        result.current.replace(makeFile())
      })

      await waitFor(() => expect(result.current.state.step).toBe('restore-failed'))
      expect(fileService.changeFileStatus).toHaveBeenCalledWith(NEW_FILE.id, { status: 'discarded' })
      if (result.current.state.step === 'restore-failed') {
        expect(result.current.state.forFile).toBe('discard')
      }
    })

    it('retry() from a generic (forFile: discard) restore-failed still discards the candidate on success — no regression from the attached-elsewhere fix', async () => {
      const { result, fileService } = await setupToLinkStep()
      vi.mocked(fileService.linkFileToEntity).mockRejectedValueOnce(confirmedRejection(409, 'already holds 1 of 1 active file(s)'))
      vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(confirmedRejection(400, 'Cannot move a file from "discarded" to "active"')) // restore fails
      vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce(ok()) // discard succeeds

      await act(async () => {
        result.current.replace(makeFile())
      })
      await waitFor(() => expect(result.current.state.step).toBe('restore-failed'))
      expect(fileService.changeFileStatus).toHaveBeenCalledWith(NEW_FILE.id, { status: 'discarded' })

      // Retry the restore — this time it succeeds, and the candidate (already discarded once) is
      // discarded again via the "already discarded" reconciliation, ending in link-failed.
      vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce(ok()) // restore succeeds
      vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(confirmedRejection(409, 'File is already "discarded"'))

      await act(async () => {
        await result.current.retry()
      })

      await waitFor(() => expect(result.current.state.step).toBe('link-failed'))
      expect(fileService.changeFileStatus).toHaveBeenCalledWith(OLD_LOGO_ID, { status: 'active' })
    })

    it('cap conflict -> restore ambiguous (network error) -> reconciles via getFile -> STILL discards candidate', async () => {
      const { result, fileService } = await setupToLinkStep()
      vi.mocked(fileService.linkFileToEntity).mockRejectedValueOnce(confirmedRejection(409, 'already holds 1 of 1 active file(s)'))
      vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(networkError()) // restore ambiguous
      vi.mocked(fileService.getFile).mockResolvedValueOnce({ success: true, message: '', data: { status: 'active' } } as never) // reconciled: already restored
      vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce(ok()) // discard succeeds

      await act(async () => {
        result.current.replace(makeFile())
      })

      await waitFor(() => expect(result.current.state.step).toBe('link-failed'))
      expect(fileService.getFile).toHaveBeenCalledWith(OLD_LOGO_ID)
      expect(fileService.changeFileStatus).toHaveBeenCalledWith(NEW_FILE.id, { status: 'discarded' })
    })
  })

  it('link ambiguous (network error) reconciling to THIS exact tenantId = success, no discard', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    await mockHappyUploadTo(fileService, uploadFileToS3)
    const { result } = renderHook(() => useReplaceTenantLogo(TENANT_ID, null))

    vi.mocked(fileService.linkFileToEntity).mockRejectedValueOnce(networkError())
    vi.mocked(fileService.getFile).mockResolvedValueOnce({
      success: true,
      message: '',
      data: { id: NEW_FILE.id, entity: { id: TENANT_ID } },
    } as never)

    await act(async () => {
      result.current.replace(makeFile())
    })

    await waitFor(() => expect(result.current.state.step).toBe('done'))
    expect(fileService.changeFileStatus).not.toHaveBeenCalledWith(NEW_FILE.id, { status: 'discarded' })
  })

  it('link ambiguous reconciling to some OTHER entity id is NOT success — terminal link-attached-elsewhere, NEVER discarded', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    await mockHappyUploadTo(fileService, uploadFileToS3)
    const { result } = renderHook(() => useReplaceTenantLogo(TENANT_ID, null))

    vi.mocked(fileService.linkFileToEntity).mockRejectedValueOnce(networkError())
    vi.mocked(fileService.getFile).mockResolvedValueOnce({
      success: true,
      message: '',
      data: { id: NEW_FILE.id, entity: { id: 'some-other-tenant' } },
    } as never)

    await act(async () => {
      result.current.replace(makeFile())
    })

    await waitFor(() => expect(result.current.state.step).toBe('link-attached-elsewhere'))
    // The foreign candidate must never be discarded; no old logo existed to restore either.
    expect(fileService.changeFileStatus).not.toHaveBeenCalledWith(NEW_FILE.id, { status: 'discarded' })
    expect(fileService.changeFileStatus).toHaveBeenCalledTimes(1)
    // A first-ever upload never had a previous logo to "keep".
    if (result.current.state.step === 'link-attached-elsewhere') {
      expect(result.current.state.hadOldLogo).toBe(false)
    }
  })

  it('link-attached-elsewhere WITH an old logo restores it to active before surfacing the terminal state — never leaves the tenant logo-less', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    await mockHappyUploadTo(fileService, uploadFileToS3)
    const { result } = renderHook(() => useReplaceTenantLogo(TENANT_ID, OLD_LOGO_ID))

    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce(ok()) // deactivate old
    vi.mocked(fileService.linkFileToEntity).mockRejectedValueOnce(networkError())
    vi.mocked(fileService.getFile).mockResolvedValueOnce({
      success: true,
      message: '',
      data: { id: NEW_FILE.id, entity: { id: 'some-other-tenant' } },
    } as never)
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce(ok()) // restore old to active

    await act(async () => {
      result.current.replace(makeFile())
    })

    await waitFor(() => expect(result.current.state.step).toBe('link-attached-elsewhere'))
    expect(fileService.changeFileStatus).toHaveBeenCalledWith(OLD_LOGO_ID, { status: 'active' })
    // The foreign candidate itself is still never touched.
    expect(fileService.changeFileStatus).not.toHaveBeenCalledWith(NEW_FILE.id, { status: 'discarded' })
  })

  it('link-attached-elsewhere restore-of-old-logo failing (confirmed 4xx) surfaces restore-failed, not a silently-lost old logo', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    await mockHappyUploadTo(fileService, uploadFileToS3)
    const { result } = renderHook(() => useReplaceTenantLogo(TENANT_ID, OLD_LOGO_ID))

    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce(ok()) // deactivate old
    vi.mocked(fileService.linkFileToEntity).mockRejectedValueOnce(networkError())
    vi.mocked(fileService.getFile).mockResolvedValueOnce({
      success: true,
      message: '',
      data: { id: NEW_FILE.id, entity: { id: 'some-other-tenant' } },
    } as never)
    vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(confirmedRejection(400, 'Cannot restore'))

    await act(async () => {
      result.current.replace(makeFile())
    })

    await waitFor(() => expect(result.current.state.step).toBe('restore-failed'))
    expect(fileService.changeFileStatus).not.toHaveBeenCalledWith(NEW_FILE.id, { status: 'discarded' })
    // Tagged so retry() knows this came from the foreign-attachment recovery path, not the
    // generic one — retrying it must never discard the candidate.
    if (result.current.state.step === 'restore-failed') {
      expect(result.current.state.forFile).toBe('attached-elsewhere')
    }
  })

  it('retry() from an attached-elsewhere restore-failed re-attempts ONLY the restore — NEVER discards the foreign candidate', async () => {
    // Regression test for the P1: a blanket retry() that always called restoreOldAndDiscard would
    // discard another entity's live logo the moment the old-logo restore needed a second attempt.
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    await mockHappyUploadTo(fileService, uploadFileToS3)
    const { result } = renderHook(() => useReplaceTenantLogo(TENANT_ID, OLD_LOGO_ID))

    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce(ok()) // deactivate old
    vi.mocked(fileService.linkFileToEntity).mockRejectedValueOnce(networkError())
    vi.mocked(fileService.getFile).mockResolvedValueOnce({
      success: true,
      message: '',
      data: { id: NEW_FILE.id, entity: { id: 'some-other-tenant' } },
    } as never)
    vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(confirmedRejection(400, 'Cannot restore'))

    await act(async () => {
      result.current.replace(makeFile())
    })
    await waitFor(() => expect(result.current.state.step).toBe('restore-failed'))

    // Retry the restore — this time it succeeds.
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce(ok())
    await act(async () => {
      await result.current.retry()
    })

    await waitFor(() => expect(result.current.state.step).toBe('link-attached-elsewhere'))
    expect(fileService.changeFileStatus).toHaveBeenCalledWith(OLD_LOGO_ID, { status: 'active' })
    // The foreign candidate must NEVER be discarded, on the original attempt OR the retry.
    expect(fileService.changeFileStatus).not.toHaveBeenCalledWith(NEW_FILE.id, { status: 'discarded' })
  })

  it('first-ever-upload link failure (confirmed 4xx, not cap/already-attached) discards directly with no restore attempt', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    await mockHappyUploadTo(fileService, uploadFileToS3)
    const { result } = renderHook(() => useReplaceTenantLogo(TENANT_ID, null))

    vi.mocked(fileService.linkFileToEntity).mockRejectedValueOnce(confirmedRejection(400, 'Validation failed'))
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce(ok()) // discard succeeds

    await act(async () => {
      result.current.replace(makeFile())
    })

    await waitFor(() => expect(result.current.state.step).toBe('link-failed'))
    expect(fileService.changeFileStatus).toHaveBeenCalledWith(NEW_FILE.id, { status: 'discarded' })
    expect(fileService.changeFileStatus).not.toHaveBeenCalledWith(OLD_LOGO_ID, expect.anything())
  })

  it('"File is already attached to an entity" (409) reconciling to THIS tenantId = success', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    await mockHappyUploadTo(fileService, uploadFileToS3)
    const { result } = renderHook(() => useReplaceTenantLogo(TENANT_ID, null))

    vi.mocked(fileService.linkFileToEntity).mockRejectedValueOnce(confirmedRejection(409, 'File is already attached to an entity'))
    vi.mocked(fileService.getFile).mockResolvedValueOnce({
      success: true,
      message: '',
      data: { id: NEW_FILE.id, entity: { id: TENANT_ID } },
    } as never)

    await act(async () => {
      result.current.replace(makeFile())
    })

    await waitFor(() => expect(result.current.state.step).toBe('done'))
  })

  it('a confirmed restore failure surfaces its own terminal error while the discard STILL fires', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    await mockHappyUploadTo(fileService, uploadFileToS3)
    const { result } = renderHook(() => useReplaceTenantLogo(TENANT_ID, OLD_LOGO_ID))

    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce(ok()) // deactivate succeeds
    vi.mocked(fileService.linkFileToEntity).mockRejectedValueOnce(confirmedRejection(409, 'already holds 1 of 1 active file(s)'))
    vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(confirmedRejection(400, 'Cannot move a file')) // restore fails
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce(ok()) // discard succeeds

    await act(async () => {
      result.current.replace(makeFile())
    })

    await waitFor(() => expect(result.current.state.step).toBe('restore-failed'))
    expect(fileService.changeFileStatus).toHaveBeenCalledWith(NEW_FILE.id, { status: 'discarded' })
  })

  describe('discard call outcome — its own visible cleanup sub-state', () => {
    it('discard confirmed-fails -> cleanup-failed sub-state present on the primary failure', async () => {
      const { fileService } = await import('@/lib/file/file.service')
      const { uploadFileToS3 } = await import('@/lib/file/file.upload')
      await mockHappyUploadTo(fileService, uploadFileToS3)
      const { result } = renderHook(() => useReplaceTenantLogo(TENANT_ID, null))

      vi.mocked(fileService.linkFileToEntity).mockRejectedValueOnce(confirmedRejection(400, 'Validation failed'))
      vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(confirmedRejection(400, 'Cannot discard')) // discard fails

      await act(async () => {
        result.current.replace(makeFile())
      })

      await waitFor(() => expect(result.current.state.step).toBe('link-failed'))
      if (result.current.state.step === 'link-failed') {
        expect(result.current.state.cleanup).toEqual({ status: 'cleanup-failed' })
      }
    })

    it('discard network-fails -> cleanup-uncertain sub-state present on the primary failure', async () => {
      const { fileService } = await import('@/lib/file/file.service')
      const { uploadFileToS3 } = await import('@/lib/file/file.upload')
      await mockHappyUploadTo(fileService, uploadFileToS3)
      const { result } = renderHook(() => useReplaceTenantLogo(TENANT_ID, null))

      vi.mocked(fileService.linkFileToEntity).mockRejectedValueOnce(confirmedRejection(400, 'Validation failed'))
      vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(networkError()) // discard ambiguous

      await act(async () => {
        result.current.replace(makeFile())
      })

      await waitFor(() => expect(result.current.state.step).toBe('link-failed'))
      if (result.current.state.step === 'link-failed') {
        expect(result.current.state.cleanup).toEqual({ status: 'cleanup-uncertain' })
      }
    })

    it('discard succeeds -> no cleanup sub-state at all', async () => {
      const { fileService } = await import('@/lib/file/file.service')
      const { uploadFileToS3 } = await import('@/lib/file/file.upload')
      await mockHappyUploadTo(fileService, uploadFileToS3)
      const { result } = renderHook(() => useReplaceTenantLogo(TENANT_ID, null))

      vi.mocked(fileService.linkFileToEntity).mockRejectedValueOnce(confirmedRejection(400, 'Validation failed'))
      vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce(ok()) // discard succeeds

      await act(async () => {
        result.current.replace(makeFile())
      })

      await waitFor(() => expect(result.current.state.step).toBe('link-failed'))
      if (result.current.state.step === 'link-failed') {
        expect(result.current.state.cleanup).toBeUndefined()
      }
    })

    it('retryCleanup() re-attempts ONLY the discard call, not the whole replacement flow', async () => {
      const { fileService } = await import('@/lib/file/file.service')
      const { uploadFileToS3 } = await import('@/lib/file/file.upload')
      await mockHappyUploadTo(fileService, uploadFileToS3)
      const { result } = renderHook(() => useReplaceTenantLogo(TENANT_ID, null))

      vi.mocked(fileService.linkFileToEntity).mockRejectedValueOnce(confirmedRejection(400, 'Validation failed'))
      vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(confirmedRejection(400, 'Cannot discard'))

      await act(async () => {
        result.current.replace(makeFile())
      })
      await waitFor(() => expect(result.current.state.step).toBe('link-failed'))

      vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce(ok())
      await act(async () => {
        await result.current.retryCleanup()
      })

      expect(fileService.linkFileToEntity).toHaveBeenCalledTimes(1) // never re-run
      await waitFor(() => expect(result.current.state.step).toBe('link-failed'))
      if (result.current.state.step === 'link-failed') {
        expect(result.current.state.cleanup).toBeUndefined()
      }
    })
  })

  it('retry() from link-failed does NOT re-link — the candidate was already discarded, re-linking it would succeed against a discarded file', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    await mockHappyUploadTo(fileService, uploadFileToS3)
    const { result } = renderHook(() => useReplaceTenantLogo(TENANT_ID, null))

    vi.mocked(fileService.linkFileToEntity).mockRejectedValueOnce(confirmedRejection(400, 'Validation failed'))
    vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce(ok()) // discard succeeds

    await act(async () => {
      result.current.replace(makeFile())
    })
    await waitFor(() => expect(result.current.state.step).toBe('link-failed'))
    expect(fileService.linkFileToEntity).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.retry()
    })

    // retry()'s switch deliberately excludes link-failed/link-conflict — no second linkFileToEntity call.
    expect(fileService.linkFileToEntity).toHaveBeenCalledTimes(1)
    expect(result.current.state.step).toBe('link-failed')
  })

  it('discardCandidate reconciles "File is already \\"discarded\\"" (409) as successful cleanup, not a fresh cleanup-failed', async () => {
    const { fileService } = await import('@/lib/file/file.service')
    const { uploadFileToS3 } = await import('@/lib/file/file.upload')
    await mockHappyUploadTo(fileService, uploadFileToS3)
    const { result } = renderHook(() => useReplaceTenantLogo(TENANT_ID, null))

    vi.mocked(fileService.linkFileToEntity).mockRejectedValueOnce(confirmedRejection(400, 'Validation failed'))
    // The discard call itself 409s because a prior attempt's discard actually landed server-side.
    vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(confirmedRejection(409, 'File is already "discarded"'))

    await act(async () => {
      result.current.replace(makeFile())
    })

    await waitFor(() => expect(result.current.state.step).toBe('link-failed'))
    // Reconciled as successful cleanup — no cleanup sub-state, primary error surfaces cleanly.
    if (result.current.state.step === 'link-failed') {
      expect(result.current.state.cleanup).toBeUndefined()
    }
  })

  describe('abandonPendingUpload()', () => {
    it('resolves "not-needed" for create-failed (confirmed 4xx, no fileId), with no network call', async () => {
      const { fileService } = await import('@/lib/file/file.service')
      vi.mocked(fileService.createFiles).mockRejectedValueOnce(confirmedRejection(400, 'Bad Request'))
      const { result } = renderHook(() => useReplaceTenantLogo(TENANT_ID, null))

      await act(async () => {
        result.current.replace(makeFile())
      })
      await waitFor(() => {
        const s = result.current.state
        return s.step === 'uploading' && s.upload.step === 'create-failed'
      })

      let outcome: string | undefined
      await act(async () => {
        outcome = await result.current.abandonPendingUpload()
      })
      expect(outcome).toBe('not-needed')
      expect(fileService.changeFileStatus).not.toHaveBeenCalled()
    })

    it('resolves "unavailable" for create-uncertain (network/5xx, no fileId), with no network call', async () => {
      const { fileService } = await import('@/lib/file/file.service')
      vi.mocked(fileService.createFiles).mockRejectedValueOnce(networkError())
      const { result } = renderHook(() => useReplaceTenantLogo(TENANT_ID, null))

      await act(async () => {
        result.current.replace(makeFile())
      })
      await waitFor(() => {
        const s = result.current.state
        return s.step === 'uploading' && s.upload.step === 'create-uncertain'
      })

      let outcome: string | undefined
      await act(async () => {
        outcome = await result.current.abandonPendingUpload()
      })
      expect(outcome).toBe('unavailable')
      expect(fileService.changeFileStatus).not.toHaveBeenCalled()
    })

    it('resolves "unavailable" for a still-in-flight "creating" (POST /files not yet settled), same as create-uncertain', async () => {
      const { fileService } = await import('@/lib/file/file.service')
      // The create call never settles during this test — 'creating' must be treated as unknown,
      // not as confirmed-nothing-persisted (it may yet create+upload+activate an unlinked file).
      vi.mocked(fileService.createFiles).mockImplementationOnce(() => new Promise(() => {}))
      const { result } = renderHook(() => useReplaceTenantLogo(TENANT_ID, null))

      await act(async () => {
        result.current.replace(makeFile())
      })
      await waitFor(() => {
        const s = result.current.state
        return s.step === 'uploading' && s.upload.step === 'creating'
      })

      let outcome: string | undefined
      await act(async () => {
        outcome = await result.current.abandonPendingUpload()
      })
      expect(outcome).toBe('unavailable')
      expect(fileService.changeFileStatus).not.toHaveBeenCalled()
    })

    it('resolves "confirmed" when a known upload-stage fileId discards successfully', async () => {
      const { fileService } = await import('@/lib/file/file.service')
      const { uploadFileToS3 } = await import('@/lib/file/file.upload')
      vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [NEW_FILE] } as never)
      vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('S3 PUT failed'))
      const { result } = renderHook(() => useReplaceTenantLogo(TENANT_ID, null))

      await act(async () => {
        result.current.replace(makeFile())
      })
      await waitFor(() => {
        const s = result.current.state
        return s.step === 'uploading' && s.upload.step === 'upload-failed'
      })

      vi.mocked(fileService.changeFileStatus).mockResolvedValueOnce(ok())
      let outcome: string | undefined
      await act(async () => {
        outcome = await result.current.abandonPendingUpload()
      })
      expect(outcome).toBe('confirmed')
      expect(fileService.changeFileStatus).toHaveBeenCalledWith(NEW_FILE.id, { status: 'discarded' })
    })

    it('resolves "confirmed" when the discard hits the exact "File is already \\"discarded\\"" 409', async () => {
      const { fileService } = await import('@/lib/file/file.service')
      const { uploadFileToS3 } = await import('@/lib/file/file.upload')
      vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [NEW_FILE] } as never)
      vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('S3 PUT failed'))
      const { result } = renderHook(() => useReplaceTenantLogo(TENANT_ID, null))

      await act(async () => {
        result.current.replace(makeFile())
      })
      await waitFor(() => {
        const s = result.current.state
        return s.step === 'uploading' && s.upload.step === 'upload-failed'
      })

      vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(confirmedRejection(409, 'File is already "discarded"'))
      let outcome: string | undefined
      await act(async () => {
        outcome = await result.current.abandonPendingUpload()
      })
      expect(outcome).toBe('confirmed')
    })

    it('resolves "unconfirmed" when the discard hits an unrelated confirmed-4xx or ambiguous failure', async () => {
      const { fileService } = await import('@/lib/file/file.service')
      const { uploadFileToS3 } = await import('@/lib/file/file.upload')
      vi.mocked(fileService.createFiles).mockResolvedValueOnce({ success: true, message: '', data: [NEW_FILE] } as never)
      vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('S3 PUT failed'))
      const { result } = renderHook(() => useReplaceTenantLogo(TENANT_ID, null))

      await act(async () => {
        result.current.replace(makeFile())
      })
      await waitFor(() => {
        const s = result.current.state
        return s.step === 'uploading' && s.upload.step === 'upload-failed'
      })

      vi.mocked(fileService.changeFileStatus).mockRejectedValueOnce(networkError())
      let outcome: string | undefined
      await act(async () => {
        outcome = await result.current.abandonPendingUpload()
      })
      expect(outcome).toBe('unconfirmed')
    })

    it('SAFETY: from link-attached-elsewhere (a real, populated newFileIdRef), abandonPendingUpload never discards the foreign candidate', async () => {
      // newFileIdRef stays populated through link-attached-elsewhere (a CONFIRMED FOREIGN entity's
      // file) — abandonPendingUpload must be a structural no-op here, never falling back to it.
      const { fileService } = await import('@/lib/file/file.service')
      const { uploadFileToS3 } = await import('@/lib/file/file.upload')
      await mockHappyUploadTo(fileService, uploadFileToS3)
      const { result } = renderHook(() => useReplaceTenantLogo(TENANT_ID, null))

      vi.mocked(fileService.linkFileToEntity).mockRejectedValueOnce(networkError())
      vi.mocked(fileService.getFile).mockResolvedValueOnce({
        success: true,
        message: '',
        data: { id: NEW_FILE.id, entity: { id: 'some-other-tenant' } },
      } as never)

      await act(async () => {
        result.current.replace(makeFile())
      })
      await waitFor(() => expect(result.current.state.step).toBe('link-attached-elsewhere'))

      vi.mocked(fileService.changeFileStatus).mockClear()
      let outcome: string | undefined
      await act(async () => {
        outcome = await result.current.abandonPendingUpload()
      })
      expect(outcome).toBe('not-needed')
      // The foreign candidate must NEVER be touched by this call.
      expect(fileService.changeFileStatus).not.toHaveBeenCalled()
    })
  })
})
