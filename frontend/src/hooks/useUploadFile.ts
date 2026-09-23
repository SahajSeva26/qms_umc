import { useRef, useState } from 'react'
import axios from 'axios'
import { fileService } from '@/lib/file/file.service'
import { uploadFileToS3 } from '@/lib/file/file.upload'
import type { FileEntityRelation, FileEntityType } from '@/types/file.types'

// Generic create -> S3-PUT -> activate orchestration hook. Has zero knowledge of any specific
// entity, linking, or rollback — those are caller-side concerns layered on the unlinked-active
// file id this hook exposes on 'done'.

export interface UploadFileConfig {
  tenant: string
  entityType: FileEntityType
  entityRelation: FileEntityRelation
  tags?: string[]
}

export type UploadState =
  | { step: 'idle' }
  | { step: 'creating' }
  // A confirmed 4xx — nothing was persisted that matters (this hook never sends entityId, so no
  // cap check even runs), so a fresh start()-equivalent retry is safe.
  | { step: 'create-failed'; error: unknown }
  // A network error/timeout/5xx — the draft may have been created despite the lost response.
  // retry() re-POSTs anyway here: an extra orphan unlinked draft is an acceptable, bounded,
  // self-contained cost (nothing else references it, and it's never linked to an entity).
  | { step: 'create-uncertain'; error: unknown }
  | { step: 'uploading'; fileId: string; uploadUrl: string; fileName: string }
  // Always ambiguous by nature — an S3 PUT can fail after the object was actually written (e.g. the
  // response was lost). retry() re-attempts the SAME uploadUrl (idempotent for a given key). Never
  // auto-falls back to create() on any particular status code — startOver() is the only path back
  // to a fresh draft, and it is always a deliberate user action.
  | { step: 'upload-failed'; fileId: string; uploadUrl: string; fileName: string; error: unknown }
  | { step: 'activating'; fileId: string; uploadUrl: string; fileName: string }
  // Confirmed 4xx OTHER than "object not uploaded yet". This hook always activates exactly one,
  // always-unlinked file (entityId is never supplied at create), so the cap's existing-active-count
  // check can never fire here — there is no cap-conflict branch, deliberately.
  | { step: 'activate-failed'; fileId: string; uploadUrl: string; fileName: string; error: unknown }
  // The confirmed "File has not been uploaded to storage yet" 409 — the object genuinely isn't in
  // S3 yet. retry() must re-PUT first, then re-activate (a bare activate-only retry would just
  // 409 identically again).
  | { step: 'activate-not-uploaded'; fileId: string; uploadUrl: string; fileName: string; error: unknown }
  // A network error/timeout/5xx on activate — reconcile via getFile() before deciding.
  | { step: 'activate-uncertain'; fileId: string; uploadUrl: string; fileName: string }
  // priorDraftCleanupConfirmed is null when no prior-draft cleanup was ever attempted (a plain
  // start()/retry() path) — distinct from true/false, which only apply after startOver() actually
  // ran its discard call. A caller must not render a "cleanup couldn't be confirmed" warning for
  // the null case; there is no prior draft to warn about.
  | { step: 'done'; fileId: string; priorDraftCleanupConfirmed: boolean | null }

const NOT_UPLOADED_MESSAGE = 'File has not been uploaded to storage yet'

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

export function useUploadFile() {
  const [state, setState] = useState<UploadState>({ step: 'idle' })
  // The original file/config passed to start() — startOver() re-uses these verbatim to re-run
  // create() with the exact same inputs, without the caller having to re-supply them.
  const originalArgsRef = useRef<{ file: File; config: UploadFileConfig } | null>(null)

  // Bumped on every start()/startOver() call. None of createFiles/uploadFileToS3/changeFileStatus
  // are actually cancelled when a caller moves on (e.g. abandons this run) — a stale run's own
  // promise chain keeps running and would otherwise call setState with a LATER run already in
  // flight, silently stomping its state with a different run's fileId. Every setState below is
  // guarded on this token so only the run that's still current can ever apply its result.
  const runIdRef = useRef(0)
  const setStateForRun = (runId: number, next: UploadState) => {
    if (runId !== runIdRef.current) return
    setState(next)
  }

  // Threaded through so the eventual 'done' state can carry it: null on plain start()/retry(),
  // a real boolean only when startOver()'s own discard call ran.
  const doCreate = async (runId: number, file: File, config: UploadFileConfig, priorDraftCleanupConfirmed: boolean | null) => {
    setStateForRun(runId, { step: 'creating' })
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
        setStateForRun(runId, { step: 'create-failed', error: err })
      } else {
        setStateForRun(runId, { step: 'create-uncertain', error: err })
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
    setStateForRun(runId, { step: 'uploading', fileId, uploadUrl, fileName })
    try {
      await uploadFileToS3(uploadUrl, file)
    } catch (err) {
      setStateForRun(runId, { step: 'upload-failed', fileId, uploadUrl, fileName, error: err })
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
    setStateForRun(runId, { step: 'activating', fileId, uploadUrl, fileName })
    try {
      await fileService.changeFileStatus(fileId, { status: 'active' })
      setStateForRun(runId, { step: 'done', fileId, priorDraftCleanupConfirmed })
    } catch (err) {
      if (is409WithMessage(err, NOT_UPLOADED_MESSAGE)) {
        setStateForRun(runId, { step: 'activate-not-uploaded', fileId, uploadUrl, fileName, error: err })
      } else if (isConfirmedRejection(err)) {
        setStateForRun(runId, { step: 'activate-failed', fileId, uploadUrl, fileName, error: err })
      } else {
        setStateForRun(runId, { step: 'activate-uncertain', fileId, uploadUrl, fileName })
      }
      throw err
    }
  }

  const start = async (file: File, config: UploadFileConfig) => {
    originalArgsRef.current = { file, config }
    const runId = ++runIdRef.current
    await doCreate(runId, file, config, null)
  }

  // Re-enters only at the currently-failed step, never restarts from idle. Reuses the current
  // run id — this is the same logical run continuing, not a new one.
  const retry = async () => {
    const runId = runIdRef.current
    switch (state.step) {
      case 'create-failed':
      case 'create-uncertain': {
        const args = originalArgsRef.current
        if (!args) return
        await doCreate(runId, args.file, args.config, null)
        return
      }
      case 'upload-failed': {
        const { fileId, uploadUrl, fileName } = state
        const args = originalArgsRef.current
        if (!args) return
        await doUpload(runId, fileId, uploadUrl, args.file, fileName, null)
        return
      }
      case 'activate-failed': {
        const { fileId, uploadUrl, fileName } = state
        await doActivate(runId, fileId, uploadUrl, fileName, null)
        return
      }
      case 'activate-not-uploaded': {
        // The object genuinely isn't in S3 yet — re-PUT first, THEN re-activate. A bare
        // activate-only retry here would just 409 identically again.
        const { fileId, uploadUrl, fileName } = state
        const args = originalArgsRef.current
        if (!args) return
        await doUpload(runId, fileId, uploadUrl, args.file, fileName, null)
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
    const { fileId, uploadUrl, fileName } = state
    try {
      const res = await fileService.getFile(fileId)
      const status = res.data?.status
      if (status === 'active') {
        setStateForRun(runId, { step: 'done', fileId, priorDraftCleanupConfirmed: null })
      } else if (status === 'draft') {
        await doActivate(runId, fileId, uploadUrl, fileName, null)
      } else {
        // discarded/inactive — something else moved it; surface as a confirmed failure rather than
        // silently retrying a transition that can no longer succeed.
        setStateForRun(runId, { step: 'activate-failed', fileId, uploadUrl, fileName, error: new Error(`File is unexpectedly "${status}"`) })
      }
    } catch {
      // A failed check is not proof either way — stay uncertain, don't fall back to a blind retry.
      setStateForRun(runId, { step: 'activate-uncertain', fileId, uploadUrl, fileName })
    }
  }

  // Discards the known draft, then REGARDLESS of that outcome, re-runs create() from scratch —
  // unlike retry(), which never calls create() again from this step.
  const startOver = async () => {
    if (state.step !== 'upload-failed') return
    const args = originalArgsRef.current
    if (!args) return

    let priorDraftCleanupConfirmed: boolean
    try {
      await fileService.changeFileStatus(state.fileId, { status: 'discarded' })
      priorDraftCleanupConfirmed = true
    } catch {
      // Either way, proceed to a fresh create() below — the eventual 'done' flag shows unconfirmed.
      priorDraftCleanupConfirmed = false
    }

    await doCreate(runIdRef.current, args.file, args.config, priorDraftCleanupConfirmed)
  }

  return { state, start, retry, startOver }
}
