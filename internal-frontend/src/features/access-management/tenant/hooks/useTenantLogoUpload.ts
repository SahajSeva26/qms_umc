import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import { uploadFileToS3 } from '@/lib/file/file.upload'

// create -> S3 PUT -> activate against /tenants/:id/logo — the server owns replace semantics, so
// there's no deactivate-old/link-new dance here, unlike the generic useReplaceFile flow.

export type TenantLogoUploadState =
  | { step: 'idle' }
  | { step: 'creating' }
  | { step: 'create-failed'; error: unknown }
  | { step: 'create-uncertain'; error: unknown }
  | { step: 'uploading'; fileId: string; uploadUrl: string; fileName: string }
  // Always ambiguous — an S3 PUT can fail after the object was actually written. retry() re-PUTs
  // the same uploadUrl (idempotent).
  | { step: 'upload-failed'; fileId: string; uploadUrl: string; fileName: string; error: unknown }
  | { step: 'activating'; fileId: string }
  | { step: 'activate-failed'; fileId: string; error: unknown }
  // The confirmed 400 for "file does not belong to this tenant logo" — not retryable, a fresh pick is needed.
  | { step: 'activate-rejected'; error: unknown }
  // Network/timeout/5xx on activate — reconcile via getLogo() before deciding.
  | { step: 'activate-uncertain'; fileId: string }
  | { step: 'done'; fileId: string }

function isConfirmedRejection(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false
  const status = err.response?.status
  return status !== undefined && status >= 400 && status < 500
}

export interface UseTenantLogoUploadOptions {
  onSuccess?: () => void
}

export function useTenantLogoUpload(tenantId: string, options?: UseTenantLogoUploadOptions) {
  const [state, setState] = useState<TenantLogoUploadState>({ step: 'idle' })
  const originalFileRef = useRef<File | null>(null)
  const onSuccessRef = useRef(options?.onSuccess)
  useEffect(() => {
    onSuccessRef.current = options?.onSuccess
  })

  // No in-flight call is actually cancelled — every setState below is guarded on this token so a
  // stale run can't stomp a later run's state.
  const runIdRef = useRef(0)
  const setStateForRun = (runId: number, next: TenantLogoUploadState) => {
    if (runId !== runIdRef.current) return
    setState(next)
  }

  const doCreate = async (runId: number, file: File) => {
    setStateForRun(runId, { step: 'creating' })
    let created: { id: string; uploadUrl?: string }
    try {
      const res = await accessManagementService.createTenantLogo(tenantId, file)
      const first = res.data?.[0]
      if (!first || !first.uploadUrl) throw new Error('Logo created but no uploadUrl was returned')
      created = first
    } catch (err) {
      setStateForRun(runId, { step: isConfirmedRejection(err) ? 'create-failed' : 'create-uncertain', error: err })
      return
    }
    await doUpload(runId, created.id, created.uploadUrl as string, file, file.name)
  }

  const doUpload = async (runId: number, fileId: string, uploadUrl: string, file: File, fileName: string) => {
    setStateForRun(runId, { step: 'uploading', fileId, uploadUrl, fileName })
    try {
      await uploadFileToS3(uploadUrl, file)
    } catch (err) {
      setStateForRun(runId, { step: 'upload-failed', fileId, uploadUrl, fileName, error: err })
      return
    }
    await doActivate(runId, fileId)
  }

  const doActivate = async (runId: number, fileId: string) => {
    setStateForRun(runId, { step: 'activating', fileId })
    try {
      await accessManagementService.activateTenantLogo(tenantId, fileId)
      setStateForRun(runId, { step: 'done', fileId })
      onSuccessRef.current?.()
    } catch (err) {
      if (isConfirmedRejection(err)) {
        const message = axios.isAxiosError(err) ? (err.response?.data as { message?: string } | undefined)?.message : undefined
        if (message === 'File does not belong to this tenant logo') {
          setStateForRun(runId, { step: 'activate-rejected', error: err })
        } else {
          setStateForRun(runId, { step: 'activate-failed', fileId, error: err })
        }
      } else {
        setStateForRun(runId, { step: 'activate-uncertain', fileId })
      }
    }
  }

  const upload = (file: File): void => {
    originalFileRef.current = file
    const runId = ++runIdRef.current
    void doCreate(runId, file)
  }

  const retry = async () => {
    const runId = runIdRef.current
    switch (state.step) {
      case 'create-failed':
      case 'create-uncertain': {
        const file = originalFileRef.current
        if (!file) return
        await doCreate(runId, file)
        return
      }
      case 'upload-failed': {
        const file = originalFileRef.current
        if (!file) return
        await doUpload(runId, state.fileId, state.uploadUrl, file, state.fileName)
        return
      }
      case 'activate-failed':
        await doActivate(runId, state.fileId)
        return
      case 'activate-uncertain':
        await reconcileActivation()
        return
      default:
        return
    }
  }

  // Reads the tenant's real active logo to decide: still draft (retry activate) or already done.
  const reconcileActivation = async () => {
    if (state.step !== 'activate-uncertain') return
    const runId = runIdRef.current
    const { fileId } = state
    try {
      const res = await accessManagementService.getTenantLogo(tenantId)
      const active = res.data?.items?.find((f) => f.id === fileId)
      if (active) {
        setStateForRun(runId, { step: 'done', fileId })
        onSuccessRef.current?.()
      } else {
        await doActivate(runId, fileId)
      }
    } catch {
      // A failed check is not proof either way — stay uncertain, don't fall back to a blind retry.
      setStateForRun(runId, { step: 'activate-uncertain', fileId })
    }
  }

  const reset = () => {
    runIdRef.current += 1
    originalFileRef.current = null
    setState({ step: 'idle' })
  }

  return { state, upload, retry, reset }
}
