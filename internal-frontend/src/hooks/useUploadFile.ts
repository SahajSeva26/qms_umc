import { useRef, useState } from 'react'
import axios from 'axios'
import { fileService } from '@/lib/file/file.service'
import { uploadFileToS3 } from '@/lib/file/file.upload'
import type { FileEntityRelation, FileEntityType } from '@/types/file.types'

// Generic create -> S3-PUT -> activate orchestration; caller layers entity linking/rollback on
// the unlinked-active file id this hook exposes on 'done'.

export interface UploadFileConfig {
  tenant: string
  entityType: FileEntityType
  entityRelation: FileEntityRelation
  tags?: string[]
}

// priorDraftCleanupConfirmed: null = nothing attempted; true = discard confirmed; false = failed
// and STICKY until the caller acknowledges it. See combineCleanupConfirmed().
export type UploadState =
  | { step: 'idle' }
  | { step: 'creating'; priorDraftCleanupConfirmed: boolean | null }
  // A confirmed 4xx — nothing persisted matters, so a fresh start()-equivalent retry is safe.
  | { step: 'create-failed'; error: unknown; priorDraftCleanupConfirmed: boolean | null }
  // Network/timeout/5xx — retry() re-POSTs anyway; an extra orphan unlinked draft is a bounded cost.
  | { step: 'create-uncertain'; error: unknown; priorDraftCleanupConfirmed: boolean | null }
  | { step: 'uploading'; fileId: string; uploadUrl: string; fileName: string; priorDraftCleanupConfirmed: boolean | null }
  // Always ambiguous — an S3 PUT can fail after the object was actually written. retry() re-PUTs
  // the SAME uploadUrl (idempotent); only startOver() goes back to a fresh draft.
  | { step: 'upload-failed'; fileId: string; uploadUrl: string; fileName: string; error: unknown; priorDraftCleanupConfirmed: boolean | null }
  | { step: 'activating'; fileId: string; uploadUrl: string; fileName: string; priorDraftCleanupConfirmed: boolean | null }
  // Confirmed 4xx other than "not uploaded yet" — this hook always activates one always-unlinked
  // file, so the cap's active-count check can never fire; no cap-conflict branch, deliberately.
  | { step: 'activate-failed'; fileId: string; uploadUrl: string; fileName: string; error: unknown; priorDraftCleanupConfirmed: boolean | null }
  // The confirmed 409 for "object not uploaded yet" — retry() must re-PUT first, then re-activate.
  | { step: 'activate-not-uploaded'; fileId: string; uploadUrl: string; fileName: string; error: unknown; priorDraftCleanupConfirmed: boolean | null }
  // A network error/timeout/5xx on activate — reconcile via getFile() before deciding.
  | { step: 'activate-uncertain'; fileId: string; uploadUrl: string; fileName: string; priorDraftCleanupConfirmed: boolean | null }
  // The discard-with-timeout wait between "start over" and the fresh create() beginning.
  | { step: 'restarting'; priorDraftCleanupConfirmed: boolean | null }
  | { step: 'done'; fileId: string; priorDraftCleanupConfirmed: boolean | null }

const NOT_UPLOADED_MESSAGE = 'File has not been uploaded to storage yet'
const RESTART_DISCARD_TIMEOUT_MS = 10_000

function isConfirmedRejection(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false
  const status = err.response?.status
  return status !== undefined && status >= 400 && status < 500
}

function is409WithMessage(err: unknown, message: string): boolean {
  if (!axios.isAxiosError(err)) return false
  if (err.response?.status !== 409) return false
  const data = err.response.data as { message?: string } | undefined
  return data?.message === message
}

// false is sticky: an earlier unconfirmed draft's cleanup stays unconfirmed regardless of whether
// a LATER, unrelated draft's own discard succeeds — cleaning up draft B says nothing about draft A.
function combineCleanupConfirmed(incoming: boolean | null, thisAttempt: boolean): boolean | null {
  if (incoming === false) return false
  return thisAttempt
}

export function useUploadFile() {
  const [state, setState] = useState<UploadState>({ step: 'idle' })
  // The original file/config passed to start() — startOver() re-uses these verbatim to re-run
  // create() with the exact same inputs, without the caller having to re-supply them.
  const originalArgsRef = useRef<{ file: File; config: UploadFileConfig } | null>(null)

  // Bumped by start() — no in-flight call is actually cancelled, so every setState below is
  // guarded on this token to stop a stale run stomping a later run's state.
  const runIdRef = useRef(0)
  const setStateForRun = (runId: number, next: UploadState) => {
    if (runId !== runIdRef.current) return
    setState(next)
  }

  // A synchronous lock (setState's async scheduling can't prevent a concurrent stale read); scoped
  // to restart PREPARATION only, cleared before doCreate — never held through the upload chain.
  const restartInFlightRef = useRef(false)

  const doCreate = async (runId: number, file: File, config: UploadFileConfig, priorDraftCleanupConfirmed: boolean | null) => {
    setStateForRun(runId, { step: 'creating', priorDraftCleanupConfirmed })
    // Only classifies the create call itself — doUpload does its own classification below.
    let created: { id: string; uploadUrl?: string }
    try {
      const res = await fileService.createFiles({
        tenant: config.tenant,
        entityType: config.entityType,
        entityRelation: config.entityRelation,
        tags: config.tags,
        // entityId is always omitted here — linking is a caller-side concern, layered on after 'done'.
        files: [{ fileName: file.name, fileSize: file.size, fileType: file.type }],
      })
      const first = res.data?.[0]
      if (!first || !first.uploadUrl) throw new Error('File created but no uploadUrl was returned')
      created = first
    } catch (err) {
      if (isConfirmedRejection(err)) {
        setStateForRun(runId, { step: 'create-failed', error: err, priorDraftCleanupConfirmed })
      } else {
        setStateForRun(runId, { step: 'create-uncertain', error: err, priorDraftCleanupConfirmed })
      }
      throw err
    }
    await doUpload(runId, created.id, created.uploadUrl as string, file, file.name, priorDraftCleanupConfirmed)
  }

  const doUpload = async (
    runId: number,
    fileId: string,
    uploadUrl: string,
    file: File,
    fileName: string,
    priorDraftCleanupConfirmed: boolean | null,
  ) => {
    setStateForRun(runId, { step: 'uploading', fileId, uploadUrl, fileName, priorDraftCleanupConfirmed })
    try {
      await uploadFileToS3(uploadUrl, file)
    } catch (err) {
      setStateForRun(runId, { step: 'upload-failed', fileId, uploadUrl, fileName, error: err, priorDraftCleanupConfirmed })
      throw err
    }
    await doActivate(runId, fileId, uploadUrl, fileName, priorDraftCleanupConfirmed)
  }

  const doActivate = async (
    runId: number,
    fileId: string,
    uploadUrl: string,
    fileName: string,
    priorDraftCleanupConfirmed: boolean | null,
  ) => {
    setStateForRun(runId, { step: 'activating', fileId, uploadUrl, fileName, priorDraftCleanupConfirmed })
    try {
      await fileService.changeFileStatus(fileId, { status: 'active' })
      setStateForRun(runId, { step: 'done', fileId, priorDraftCleanupConfirmed })
    } catch (err) {
      if (is409WithMessage(err, NOT_UPLOADED_MESSAGE)) {
        setStateForRun(runId, { step: 'activate-not-uploaded', fileId, uploadUrl, fileName, error: err, priorDraftCleanupConfirmed })
      } else if (isConfirmedRejection(err)) {
        setStateForRun(runId, { step: 'activate-failed', fileId, uploadUrl, fileName, error: err, priorDraftCleanupConfirmed })
      } else {
        setStateForRun(runId, { step: 'activate-uncertain', fileId, uploadUrl, fileName, priorDraftCleanupConfirmed })
      }
      throw err
    }
  }

  const start = async (file: File, config: UploadFileConfig) => {
    originalArgsRef.current = { file, config }
    const runId = ++runIdRef.current
    await doCreate(runId, file, config, null)
  }

  // Re-enters only at the currently-failed step, reusing the current run id. Bails while a
  // restart is being prepared, so a stale closure can't race a real restart.
  const retry = async () => {
    if (restartInFlightRef.current) return
    const runId = runIdRef.current
    switch (state.step) {
      case 'create-failed':
      case 'create-uncertain': {
        const args = originalArgsRef.current
        if (!args) return
        await doCreate(runId, args.file, args.config, state.priorDraftCleanupConfirmed)
        return
      }
      case 'upload-failed': {
        const { fileId, uploadUrl, fileName, priorDraftCleanupConfirmed } = state
        const args = originalArgsRef.current
        if (!args) return
        await doUpload(runId, fileId, uploadUrl, args.file, fileName, priorDraftCleanupConfirmed)
        return
      }
      case 'activate-failed': {
        const { fileId, uploadUrl, fileName, priorDraftCleanupConfirmed } = state
        await doActivate(runId, fileId, uploadUrl, fileName, priorDraftCleanupConfirmed)
        return
      }
      case 'activate-not-uploaded': {
        // The object genuinely isn't in S3 yet — re-PUT first, THEN re-activate. A bare
        // activate-only retry here would just 409 identically again.
        const { fileId, uploadUrl, fileName, priorDraftCleanupConfirmed } = state
        const args = originalArgsRef.current
        if (!args) return
        await doUpload(runId, fileId, uploadUrl, args.file, fileName, priorDraftCleanupConfirmed)
        return
      }
      case 'activate-uncertain': {
        await reconcileActivation()
        return
      }
      default:
        return
    }
  }

  // Reads the file's real status to decide: retry activate (still draft) or treat as already-done.
  const reconcileActivation = async () => {
    if (state.step !== 'activate-uncertain') return
    const runId = runIdRef.current
    const { fileId, uploadUrl, fileName, priorDraftCleanupConfirmed } = state
    try {
      const res = await fileService.getFile(fileId)
      const status = res.data?.status
      if (status === 'active') {
        setStateForRun(runId, { step: 'done', fileId, priorDraftCleanupConfirmed })
      } else if (status === 'draft') {
        await doActivate(runId, fileId, uploadUrl, fileName, priorDraftCleanupConfirmed)
      } else {
        // discarded/inactive — something else moved it; surface as a confirmed failure rather than
        // silently retrying a transition that can no longer succeed.
        setStateForRun(runId, { step: 'activate-failed', fileId, uploadUrl, fileName, error: new Error(`File is unexpectedly "${status}"`), priorDraftCleanupConfirmed })
      }
    } catch {
      // A failed check is not proof either way — stay uncertain, don't fall back to a blind retry.
      setStateForRun(runId, { step: 'activate-uncertain', fileId, uploadUrl, fileName, priorDraftCleanupConfirmed })
    }
  }

  // Discards the known draft (timeout-bounded, since the request itself can't be cancelled), then
  // REGARDLESS of that outcome re-runs create() — unlike retry(), which never does from this step.
  const startOver = async () => {
    if (state.step !== 'upload-failed') return
    if (restartInFlightRef.current) return
    restartInFlightRef.current = true
    const runId = runIdRef.current
    const args = originalArgsRef.current
    const { fileId, priorDraftCleanupConfirmed: incoming } = state

    let thisAttemptConfirmed: boolean
    try {
      // Carry `incoming` forward unchanged, not reset to null, or a sticky-false warning would flicker off.
      setStateForRun(runId, { step: 'restarting', priorDraftCleanupConfirmed: incoming })

      let timeoutId: ReturnType<typeof setTimeout> | undefined
      const timeout = new Promise<'timeout'>((resolve) => {
        timeoutId = setTimeout(() => resolve('timeout'), RESTART_DISCARD_TIMEOUT_MS)
      })
      try {
        const outcome = await Promise.race([
          fileService.changeFileStatus(fileId, { status: 'discarded' }).then(() => 'discarded' as const),
          timeout,
        ])
        // A timeout is treated the same as a rejection below — never reported as confirmed.
        thisAttemptConfirmed = outcome === 'discarded'
      } catch {
        thisAttemptConfirmed = false
      } finally {
        clearTimeout(timeoutId)
      }
    } finally {
      restartInFlightRef.current = false
    }

    if (!args) return
    // setStateForRun's no-op only skips the render, not doCreate itself — a newer run must not
    // have a stale restart attach a fresh create() to it.
    if (runId !== runIdRef.current) return

    const priorDraftCleanupConfirmed = combineCleanupConfirmed(incoming, thisAttemptConfirmed)
    await doCreate(runId, args.file, args.config, priorDraftCleanupConfirmed)
  }

  return { state, start, retry, startOver }
}
