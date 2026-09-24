import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { fileService } from '@/lib/file/file.service'
import { useUploadFile, type UploadState } from '@/hooks/useUploadFile'
import type { FileEntityRelation, FileEntityType } from '@/types/file.types'

// Orchestrates a file REPLACEMENT: upload -> deactivate old (if any) -> link -> on failure, restore
// old + discard the candidate. tenantId/entityId coincide only for tenant logo.

export type CleanupSubState = { status: 'cleanup-failed' | 'cleanup-uncertain' }

// Result of abandonPendingUpload() — see its own comment for the file-id safety restriction.
export type AbandonResult = 'not-needed' | 'confirmed' | 'unconfirmed' | 'unavailable'

export type ReplaceFileState =
  | { step: 'idle' }
  | { step: 'uploading'; upload: UploadState }
  // priorDraftCleanupConfirmed: threaded through so the UI can keep showing its caption past the
  // upload step. null = no prior-draft cleanup attempted; true/false = startOver()'s actual result.
  | { step: 'deactivating-old'; priorDraftCleanupConfirmed: boolean | null }
  | { step: 'deactivate-uncertain'; priorDraftCleanupConfirmed: boolean | null }
  | { step: 'deactivate-failed'; error: unknown; priorDraftCleanupConfirmed: boolean | null; cleanup?: CleanupSubState }
  | { step: 'linking-new'; priorDraftCleanupConfirmed: boolean | null }
  | { step: 'link-failed'; error: unknown; priorDraftCleanupConfirmed: boolean | null; cleanup?: CleanupSubState }
  | { step: 'link-conflict'; error: unknown; priorDraftCleanupConfirmed: boolean | null; cleanup?: CleanupSubState }
  // Candidate is attached to a DIFFERENT entity — terminal, never discarded; old file is restored
  // first if there was one. hadOldLogo's name is kept from this state machine's tenant-logo origin.
  | { step: 'link-attached-elsewhere'; error: unknown; priorDraftCleanupConfirmed: boolean | null; hadOldLogo: boolean }
  | { step: 'link-uncertain-checking'; priorDraftCleanupConfirmed: boolean | null }
  | { step: 'restoring-old'; priorDraftCleanupConfirmed: boolean | null }
  // forFile: which recovery path produced this — 'attached-elsewhere' must never discard on
  // retry (candidate belongs to a different entity); 'discard' safely can once restore confirms.
  | { step: 'restore-uncertain'; linkError: unknown; priorDraftCleanupConfirmed: boolean | null; cleanup?: CleanupSubState; forFile: 'discard' | 'attached-elsewhere' }
  | { step: 'restore-failed'; linkError: unknown; priorDraftCleanupConfirmed: boolean | null; cleanup?: CleanupSubState; forFile: 'discard' | 'attached-elsewhere' }
  | { step: 'cleaning-up-orphan'; primary: ReplaceFileState }
  | { step: 'done'; fileId: string; priorDraftCleanupConfirmed: boolean | null }

// Re-exported for the thin wrappers' own backward-compatible type exports.
export type ReplaceLogoState = ReplaceFileState

const DEACTIVATE_ALREADY_INACTIVE = 'File is already "inactive"'
const ALREADY_DISCARDED = 'File is already "discarded"'
const LINK_ALREADY_ATTACHED = 'File is already attached to an entity'

function isConfirmedRejection(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false
  const status = err.response?.status
  return status !== undefined && status >= 400 && status < 500
}

function messageOf(err: unknown): string | undefined {
  if (!axios.isAxiosError(err)) return undefined
  const data = err.response?.data as { message?: string } | undefined
  return data?.message
}

function is409WithMessage(err: unknown, message: string): boolean {
  return axios.isAxiosError(err) && err.response?.status === 409 && messageOf(err) === message
}

function isCapConflict(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false
  const status = err.response?.status
  const msg = messageOf(err) ?? ''
  if (status === 400 && /accepts at most \d+ file/i.test(msg)) return true
  if (status === 409 && /already holds \d+ of \d+ active file/i.test(msg)) return true
  return false
}

// Only an EXACT match to this entityId counts as success — never merely truthy — since a stale/
// reused doc could be linked to a different entity.
function linkedEntityId(entity: unknown): string | undefined {
  if (!entity || typeof entity !== 'object') return undefined
  const id = (entity as { id?: unknown }).id
  return typeof id === 'string' ? id : undefined
}

export interface UseReplaceFileOptions {
  onSuccess?: () => void
}

export function useReplaceFile(
  tenantId: string,
  entityType: FileEntityType,
  entityRelation: FileEntityRelation,
  entityId: string,
  oldFileId: string | null,
  options?: UseReplaceFileOptions,
) {
  const [state, setState] = useState<ReplaceFileState>({ step: 'idle' })
  const uploadFile = useUploadFile()
  // The candidate's file id, once known — needed by recovery/cleanup past useUploadFile's 'done'.
  const newFileIdRef = useRef<string | null>(null)
  const oldFileIdRef = useRef<string | null>(oldFileId)
  const onSuccessRef = useRef(options?.onSuccess)
  useEffect(() => {
    oldFileIdRef.current = oldFileId
    onSuccessRef.current = options?.onSuccess
  })

  // Bumped by replace() and abandonPendingUpload() so a stale run's post-upload handoff
  // (deactivateOld/linkNew) can't fire after a newer run/abandon on this same hook instance.
  const runIdRef = useRef(0)
  const startRunIdRef = useRef(0)

  // ---- step 4: unified cleanup (discard the orphaned new candidate) ----
  const discardCandidate = async (primary: ReplaceFileState): Promise<void> => {
    const fileId = newFileIdRef.current
    if (!fileId) {
      setState(primary)
      return
    }
    setState({ step: 'cleaning-up-orphan', primary })
    try {
      await fileService.changeFileStatus(fileId, { status: 'discarded' })
      // Discard succeeded — no extra sub-state, surface the primary failure as-is.
      setState(primary)
    } catch (err) {
      if (is409WithMessage(err, ALREADY_DISCARDED)) {
        // A prior attempt's discard actually landed server-side even though that attempt saw a
        // failure/timeout — this IS successful cleanup, not a fresh failure to report.
        setState(primary)
        return
      }
      const cleanup: CleanupSubState = { status: isConfirmedRejection(err) ? 'cleanup-failed' : 'cleanup-uncertain' }
      setState(withCleanup(primary, cleanup))
    }
  }

  const retryCleanup = async (): Promise<void> => {
    if (!('cleanup' in state) || !state.cleanup) return
    const { cleanup: _drop, ...rest } = state
    void _drop
    await discardCandidate(rest as ReplaceFileState)
  }

  // ---- step 3 recovery: restore the old file, then always discard the candidate ----
  const restoreOldAndDiscard = async (linkError: unknown, oldFileIdKnown: string, priorDraftCleanupConfirmed: boolean | null): Promise<void> => {
    setState({ step: 'restoring-old', priorDraftCleanupConfirmed })
    try {
      await fileService.changeFileStatus(oldFileIdKnown, { status: 'active' })
      // Restore succeeded — proceed to discard the candidate; overall outcome is still a failure.
      await discardCandidate({ step: 'link-failed', error: linkError, priorDraftCleanupConfirmed })
      return
    } catch (restoreErr) {
      if (isConfirmedRejection(restoreErr)) {
        await discardCandidate({ step: 'restore-failed', linkError, priorDraftCleanupConfirmed, forFile: 'discard' })
        return
      }
      // Ambiguous — follow up with getFile before deciding whether to retry or accept.
      try {
        const res = await fileService.getFile(oldFileIdKnown)
        const status = res.data?.status
        if (status === 'active') {
          // Reconciled as already restored — still discard, still surface the overall failure.
          await discardCandidate({ step: 'link-failed', error: linkError, priorDraftCleanupConfirmed })
        } else {
          // Not confirmed restored — surface as restore-failed (retryable), discard regardless.
          await discardCandidate({ step: 'restore-failed', linkError, priorDraftCleanupConfirmed, forFile: 'discard' })
        }
      } catch {
        // Still can't tell — surface as restore-uncertain (retryable), discard regardless.
        await discardCandidate({ step: 'restore-uncertain', linkError, priorDraftCleanupConfirmed, forFile: 'discard' })
      }
    }
  }

  // Candidate is attached to a DIFFERENT entity — never discards; restores the old file (if any),
  // surfacing link-attached-elsewhere only if that restore itself succeeds (else restore-failed/-uncertain).
  const restoreOldForAttachedElsewhere = async (
    linkError: unknown,
    oldFileIdKnown: string | null,
    priorDraftCleanupConfirmed: boolean | null,
  ): Promise<void> => {
    const attachedElsewhere: ReplaceFileState = {
      step: 'link-attached-elsewhere',
      error: linkError,
      priorDraftCleanupConfirmed,
      hadOldLogo: oldFileIdKnown !== null,
    }
    if (!oldFileIdKnown) {
      setState(attachedElsewhere)
      return
    }
    setState({ step: 'restoring-old', priorDraftCleanupConfirmed })
    try {
      await fileService.changeFileStatus(oldFileIdKnown, { status: 'active' })
      setState(attachedElsewhere)
    } catch (restoreErr) {
      if (isConfirmedRejection(restoreErr)) {
        setState({ step: 'restore-failed', linkError, priorDraftCleanupConfirmed, forFile: 'attached-elsewhere' })
        return
      }
      try {
        const res = await fileService.getFile(oldFileIdKnown)
        const status = res.data?.status
        if (status === 'active') {
          setState(attachedElsewhere)
        } else {
          setState({ step: 'restore-failed', linkError, priorDraftCleanupConfirmed, forFile: 'attached-elsewhere' })
        }
      } catch {
        setState({ step: 'restore-uncertain', linkError, priorDraftCleanupConfirmed, forFile: 'attached-elsewhere' })
      }
    }
  }

  // ---- step 2: deactivate the old file ----
  const deactivateOld = async (oldFileIdKnown: string, priorDraftCleanupConfirmed: boolean | null): Promise<void> => {
    setState({ step: 'deactivating-old', priorDraftCleanupConfirmed })
    try {
      await fileService.changeFileStatus(oldFileIdKnown, { status: 'inactive' })
      await linkNew(priorDraftCleanupConfirmed)
    } catch (err) {
      if (is409WithMessage(err, DEACTIVATE_ALREADY_INACTIVE)) {
        // Genuinely safe no-op — the desired end state already holds.
        await linkNew(priorDraftCleanupConfirmed)
        return
      }
      if (isConfirmedRejection(err)) {
        // This request did not change the old file — no restore attempted, nothing to undo.
        try {
          await fileService.getFile(oldFileIdKnown)
        } catch {
          // best-effort only
        }
        await discardCandidate({ step: 'deactivate-failed', error: err, priorDraftCleanupConfirmed })
        return
      }
      // Network/timeout/5xx — ambiguous, reconcile via getFile before deciding.
      try {
        const res = await fileService.getFile(oldFileIdKnown)
        const status = res.data?.status
        if (status === 'inactive') {
          await linkNew(priorDraftCleanupConfirmed)
        } else {
          // Still not confirmed inactive — surface as deactivate-uncertain (retryable).
          setState({ step: 'deactivate-uncertain', priorDraftCleanupConfirmed })
        }
      } catch {
        setState({ step: 'deactivate-uncertain', priorDraftCleanupConfirmed })
      }
    }
  }

  // ---- step 3: link the new file to the entity ----
  const linkNew = async (priorDraftCleanupConfirmed: boolean | null): Promise<void> => {
    const fileId = newFileIdRef.current
    if (!fileId) return
    setState({ step: 'linking-new', priorDraftCleanupConfirmed })
    try {
      await fileService.linkFileToEntity(fileId, { entityId })
      finishSuccess(fileId, priorDraftCleanupConfirmed)
    } catch (err) {
      const oldFileIdKnown = oldFileIdRef.current
      if (isCapConflict(err)) {
        // Genuine conflict, not transient — proceed to recovery.
        if (oldFileIdKnown) await restoreOldAndDiscard(err, oldFileIdKnown, priorDraftCleanupConfirmed)
        else await discardCandidate({ step: 'link-conflict', error: err, priorDraftCleanupConfirmed })
        return
      }
      if (is409WithMessage(err, LINK_ALREADY_ATTACHED)) {
        // Reconcile: attached to THIS entity (success) or genuinely to some OTHER entity (a live
        // record that must never be touched)?
        setState({ step: 'link-uncertain-checking', priorDraftCleanupConfirmed })
        try {
          const res = await fileService.getFile(fileId)
          if (linkedEntityId(res.data?.entity) === entityId) {
            finishSuccess(fileId, priorDraftCleanupConfirmed)
            return
          }
          if (res.data?.entity?.id) {
            // Confirmed attached elsewhere — never discard the candidate; restore old file instead.
            await restoreOldForAttachedElsewhere(err, oldFileIdKnown, priorDraftCleanupConfirmed)
            return
          }
        } catch {
          // fall through to failure handling below
        }
        if (oldFileIdKnown) await restoreOldAndDiscard(err, oldFileIdKnown, priorDraftCleanupConfirmed)
        else await discardCandidate({ step: 'link-failed', error: err, priorDraftCleanupConfirmed })
        return
      }
      if (isConfirmedRejection(err)) {
        // Genuine validation failure, neither a cap message nor already-attached.
        if (oldFileIdKnown) await restoreOldAndDiscard(err, oldFileIdKnown, priorDraftCleanupConfirmed)
        else await discardCandidate({ step: 'link-failed', error: err, priorDraftCleanupConfirmed })
        return
      }
      // Network/timeout/5xx — ambiguous. Reconcile via getFile, checking entity.id EXACTLY equals
      // this entityId (not merely truthy) before treating it as success.
      setState({ step: 'link-uncertain-checking', priorDraftCleanupConfirmed })
      try {
        const res = await fileService.getFile(fileId)
        if (linkedEntityId(res.data?.entity) === entityId) {
          finishSuccess(fileId, priorDraftCleanupConfirmed)
          return
        }
        if (res.data?.entity?.id) {
          // Attached to some OTHER entity — never discard/retry the candidate, but DO restore the
          // old file (if any) so this entity isn't left without one.
          await restoreOldForAttachedElsewhere(err, oldFileIdKnown, priorDraftCleanupConfirmed)
          return
        }
      } catch {
        // fall through to recovery below
      }
      if (oldFileIdKnown) await restoreOldAndDiscard(err, oldFileIdKnown, priorDraftCleanupConfirmed)
      else await discardCandidate({ step: 'link-failed', error: err, priorDraftCleanupConfirmed })
    }
  }

  const finishSuccess = (fileId: string, priorDraftCleanupConfirmed: boolean | null) => {
    setState({ step: 'done', fileId, priorDraftCleanupConfirmed })
    onSuccessRef.current?.()
  }

  const replace = (file: File): void => {
    runIdRef.current += 1
    startRunIdRef.current = runIdRef.current
    newFileIdRef.current = null
    setState({ step: 'uploading', upload: { step: 'creating', priorDraftCleanupConfirmed: null } })
    // Failure is already tracked in useUploadFile's own state, surfaced via the effect below.
    void uploadFile.start(file, { tenant: tenantId, entityType, entityRelation }).catch(() => {})
  }

  // Syncs useUploadFile's state in while replace() is in flight; on 'done', hands off to
  // deactivate-old/link-new. Effect (not inline) so the async handoff never runs during render.
  useEffect(() => {
    if (state.step !== 'uploading') return
    if (uploadFile.state.step === 'done') {
      if (runIdRef.current !== startRunIdRef.current) return
      newFileIdRef.current = uploadFile.state.fileId
      const priorDraftCleanupConfirmed = uploadFile.state.priorDraftCleanupConfirmed
      const oldFileIdKnown = oldFileIdRef.current
      if (oldFileIdKnown) void deactivateOld(oldFileIdKnown, priorDraftCleanupConfirmed)
      else void linkNew(priorDraftCleanupConfirmed)
      return
    }
    if (uploadFile.state !== state.upload) {
      setState({ step: 'uploading', upload: uploadFile.state })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadFile.state, state.step])

  // SAFETY: reads the file id from uploadFile.state, never newFileIdRef — that ref stays populated
  // through link-attached-elsewhere and would risk discarding a CONFIRMED FOREIGN entity's file.
  const abandonPendingUpload = async (): Promise<AbandonResult> => {
    if (state.step !== 'uploading') return 'not-needed'
    // Bumps runIdRef so this run's late completion (the network call isn't cancelled) can never
    // reach linkNew/deactivateOld — the sync effect above checks runIdRef !== startRunIdRef.
    runIdRef.current += 1
    const upload = uploadFile.state
    if (!('fileId' in upload)) {
      // creating: the POST is still in flight, may yet create+upload+activate an unlinked file —
      // exactly as unknown as create-uncertain. Only create-failed (a confirmed 4xx) is 'not-needed'.
      return upload.step === 'create-failed' ? 'not-needed' : 'unavailable'
    }
    try {
      await fileService.changeFileStatus(upload.fileId, { status: 'discarded' })
      return 'confirmed'
    } catch (err) {
      if (is409WithMessage(err, ALREADY_DISCARDED)) {
        // A prior attempt's discard actually landed server-side despite that attempt seeing a
        // failure/timeout — this IS successful cleanup, not a fresh failure to report.
        return 'confirmed'
      }
      return 'unconfirmed'
    }
  }

  return {
    state,
    replace,
    // Pass-throughs so the UI can drive every useUploadFile failure branch while 'uploading'.
    retryUpload: uploadFile.retry,
    startOverUpload: uploadFile.startOver,
    retryCleanup,
    abandonPendingUpload,
    // deactivate-failed/link-failed/link-conflict excluded on purpose — discard was already
    // attempted for the candidate (retryCleanup handles a failed one); retrying would re-use it.
    retry: async () => {
      const oldFileIdKnown = oldFileIdRef.current
      switch (state.step) {
        case 'deactivate-uncertain':
          if (oldFileIdKnown) await deactivateOld(oldFileIdKnown, state.priorDraftCleanupConfirmed)
          return
        case 'link-uncertain-checking':
          await linkNew(state.priorDraftCleanupConfirmed)
          return
        case 'restore-uncertain':
        case 'restore-failed':
          if (!oldFileIdKnown) return
          // forFile routes retry to the SAME recovery path — attached-elsewhere must never
          // fall through to the discard-capable path.
          if (state.forFile === 'attached-elsewhere') {
            await restoreOldForAttachedElsewhere(state.linkError, oldFileIdKnown, state.priorDraftCleanupConfirmed)
          } else {
            await restoreOldAndDiscard(state.linkError, oldFileIdKnown, state.priorDraftCleanupConfirmed)
          }
          return
        default:
          return
      }
    },
  }
}

function withCleanup(state: ReplaceFileState, cleanup: CleanupSubState): ReplaceFileState {
  if (
    state.step === 'deactivate-failed' ||
    state.step === 'link-failed' ||
    state.step === 'link-conflict' ||
    state.step === 'restore-uncertain' ||
    state.step === 'restore-failed'
  ) {
    return { ...state, cleanup }
  }
  return state
}
