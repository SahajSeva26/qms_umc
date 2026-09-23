import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { fileService } from '@/lib/file/file.service'
import { useUploadFile, type UploadState } from '@/hooks/useUploadFile'

// Orchestrates a tenant logo REPLACEMENT on top of useUploadFile: upload -> deactivate old (if
// any) -> link new -> on failure, restore old + discard the orphaned candidate.
// Takes `oldLogoId` as a parameter (not via useTenantLogo internally) so the caller controls when
// it's safe to invoke — must not fire while that query is loading/erroring.

export type CleanupSubState = { status: 'cleanup-failed' | 'cleanup-uncertain' }

// Result of abandonPendingUpload() — see its own comment for the file-id safety restriction.
export type AbandonResult = 'not-needed' | 'confirmed' | 'unconfirmed' | 'unavailable'

export type ReplaceLogoState =
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
  // Candidate is attached to a DIFFERENT entity — terminal, never discarded (it's someone else's
  // live file). Old logo is restored first if there was one; hadOldLogo drives the UI's wording.
  | { step: 'link-attached-elsewhere'; error: unknown; priorDraftCleanupConfirmed: boolean | null; hadOldLogo: boolean }
  | { step: 'link-uncertain-checking'; priorDraftCleanupConfirmed: boolean | null }
  | { step: 'restoring-old'; priorDraftCleanupConfirmed: boolean | null }
  // forFile: which recovery path produced this — 'attached-elsewhere' must never discard on
  // retry (candidate belongs to a different entity); 'discard' safely can once restore confirms.
  | { step: 'restore-uncertain'; linkError: unknown; priorDraftCleanupConfirmed: boolean | null; cleanup?: CleanupSubState; forFile: 'discard' | 'attached-elsewhere' }
  | { step: 'restore-failed'; linkError: unknown; priorDraftCleanupConfirmed: boolean | null; cleanup?: CleanupSubState; forFile: 'discard' | 'attached-elsewhere' }
  | { step: 'cleaning-up-orphan'; primary: ReplaceLogoState }
  | { step: 'done'; fileId: string }

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

// Only an EXACT match to this tenantId counts as success — never merely truthy — since a stale/
// reused doc could be linked to a different entity.
function linkedEntityId(entity: unknown): string | undefined {
  if (!entity || typeof entity !== 'object') return undefined
  const id = (entity as { id?: unknown }).id
  return typeof id === 'string' ? id : undefined
}

export interface UseReplaceTenantLogoOptions {
  onSuccess?: () => void
}

export function useReplaceTenantLogo(tenantId: string, oldLogoId: string | null, options?: UseReplaceTenantLogoOptions) {
  const [state, setState] = useState<ReplaceLogoState>({ step: 'idle' })
  const uploadFile = useUploadFile()
  // The candidate's file id, once known — needed by recovery/cleanup past useUploadFile's 'done'.
  const newFileIdRef = useRef<string | null>(null)
  const oldLogoIdRef = useRef<string | null>(oldLogoId)
  const onSuccessRef = useRef(options?.onSuccess)
  useEffect(() => {
    oldLogoIdRef.current = oldLogoId
    onSuccessRef.current = options?.onSuccess
  })

  // Defense-in-depth alongside useUploadFile's own run guard (see its runIdRef): bumped on every
  // replace() call so a stale run's post-upload handoff (deactivateOld/linkNew) can't fire after
  // a newer run has started on this same hook instance.
  const runIdRef = useRef(0)
  const startRunIdRef = useRef(0)

  // ---- step 4: unified cleanup (discard the orphaned new candidate) ----
  const discardCandidate = async (primary: ReplaceLogoState): Promise<void> => {
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
    await discardCandidate(rest as ReplaceLogoState)
  }

  // ---- step 3 recovery: restore the old logo, then always discard the candidate ----
  const restoreOldAndDiscard = async (linkError: unknown, oldLogoIdKnown: string, priorDraftCleanupConfirmed: boolean | null): Promise<void> => {
    setState({ step: 'restoring-old', priorDraftCleanupConfirmed })
    try {
      await fileService.changeFileStatus(oldLogoIdKnown, { status: 'active' })
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
        const res = await fileService.getFile(oldLogoIdKnown)
        const status = res.data?.status
        if (status === 'active') {
          // Reconciled as already restored — still discard, still surface the overall failure.
          await discardCandidate({ step: 'link-failed', error: linkError, priorDraftCleanupConfirmed })
        } else {
          // Not confirmed restored — surface as a terminal restore failure, discard regardless.
          await discardCandidate({ step: 'restore-failed', linkError, priorDraftCleanupConfirmed, forFile: 'discard' })
        }
      } catch {
        // Still can't tell — surface as restore-uncertain (retryable), discard regardless.
        await discardCandidate({ step: 'restore-uncertain', linkError, priorDraftCleanupConfirmed, forFile: 'discard' })
      }
    }
  }

  // Candidate is attached to a DIFFERENT entity — never discards; restores the old logo (if any)
  // then always surfaces link-attached-elsewhere, regardless of the restore's own outcome.
  const restoreOldForAttachedElsewhere = async (
    linkError: unknown,
    oldLogoIdKnown: string | null,
    priorDraftCleanupConfirmed: boolean | null,
  ): Promise<void> => {
    const attachedElsewhere: ReplaceLogoState = {
      step: 'link-attached-elsewhere',
      error: linkError,
      priorDraftCleanupConfirmed,
      hadOldLogo: oldLogoIdKnown !== null,
    }
    if (!oldLogoIdKnown) {
      setState(attachedElsewhere)
      return
    }
    setState({ step: 'restoring-old', priorDraftCleanupConfirmed })
    try {
      await fileService.changeFileStatus(oldLogoIdKnown, { status: 'active' })
      setState(attachedElsewhere)
    } catch (restoreErr) {
      if (isConfirmedRejection(restoreErr)) {
        setState({ step: 'restore-failed', linkError, priorDraftCleanupConfirmed, forFile: 'attached-elsewhere' })
        return
      }
      try {
        const res = await fileService.getFile(oldLogoIdKnown)
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

  // ---- step 2: deactivate the old logo ----
  const deactivateOld = async (oldLogoIdKnown: string, priorDraftCleanupConfirmed: boolean | null): Promise<void> => {
    setState({ step: 'deactivating-old', priorDraftCleanupConfirmed })
    try {
      await fileService.changeFileStatus(oldLogoIdKnown, { status: 'inactive' })
      await linkNew(priorDraftCleanupConfirmed)
    } catch (err) {
      if (is409WithMessage(err, DEACTIVATE_ALREADY_INACTIVE)) {
        // Genuinely safe no-op — the desired end state already holds.
        await linkNew(priorDraftCleanupConfirmed)
        return
      }
      if (isConfirmedRejection(err)) {
        // This request did not change the old logo — no restore attempted, nothing to undo.
        try {
          await fileService.getFile(oldLogoIdKnown)
        } catch {
          // best-effort only
        }
        await discardCandidate({ step: 'deactivate-failed', error: err, priorDraftCleanupConfirmed })
        return
      }
      // Network/timeout/5xx — ambiguous, reconcile via getFile before deciding.
      try {
        const res = await fileService.getFile(oldLogoIdKnown)
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

  // ---- step 3: link the new file to the tenant entity ----
  const linkNew = async (priorDraftCleanupConfirmed: boolean | null): Promise<void> => {
    const fileId = newFileIdRef.current
    if (!fileId) return
    setState({ step: 'linking-new', priorDraftCleanupConfirmed })
    try {
      await fileService.linkFileToEntity(fileId, { entityId: tenantId })
      finishSuccess(fileId)
    } catch (err) {
      const oldLogoIdKnown = oldLogoIdRef.current
      if (isCapConflict(err)) {
        // Genuine conflict, not transient — proceed to recovery.
        if (oldLogoIdKnown) await restoreOldAndDiscard(err, oldLogoIdKnown, priorDraftCleanupConfirmed)
        else await discardCandidate({ step: 'link-conflict', error: err, priorDraftCleanupConfirmed })
        return
      }
      if (is409WithMessage(err, LINK_ALREADY_ATTACHED)) {
        // Reconcile: attached to THIS tenant (success) or genuinely to some OTHER entity (a live
        // record that must never be touched)?
        setState({ step: 'link-uncertain-checking', priorDraftCleanupConfirmed })
        try {
          const res = await fileService.getFile(fileId)
          if (linkedEntityId(res.data?.entity) === tenantId) {
            finishSuccess(fileId)
            return
          }
          if (res.data?.entity?.id) {
            // Confirmed attached elsewhere — never discard the candidate; restore old logo instead.
            await restoreOldForAttachedElsewhere(err, oldLogoIdKnown, priorDraftCleanupConfirmed)
            return
          }
        } catch {
          // fall through to failure handling below
        }
        if (oldLogoIdKnown) await restoreOldAndDiscard(err, oldLogoIdKnown, priorDraftCleanupConfirmed)
        else await discardCandidate({ step: 'link-failed', error: err, priorDraftCleanupConfirmed })
        return
      }
      if (isConfirmedRejection(err)) {
        // Genuine validation failure, neither a cap message nor already-attached.
        if (oldLogoIdKnown) await restoreOldAndDiscard(err, oldLogoIdKnown, priorDraftCleanupConfirmed)
        else await discardCandidate({ step: 'link-failed', error: err, priorDraftCleanupConfirmed })
        return
      }
      // Network/timeout/5xx — ambiguous. Reconcile via getFile, checking entity.id EXACTLY equals
      // this tenantId (not merely truthy) before treating it as success.
      setState({ step: 'link-uncertain-checking', priorDraftCleanupConfirmed })
      try {
        const res = await fileService.getFile(fileId)
        if (linkedEntityId(res.data?.entity) === tenantId) {
          finishSuccess(fileId)
          return
        }
        if (res.data?.entity?.id) {
          // Attached to some OTHER entity — never discard/retry the candidate, but DO restore the
          // old logo (if any) so this tenant isn't left logo-less.
          await restoreOldForAttachedElsewhere(err, oldLogoIdKnown, priorDraftCleanupConfirmed)
          return
        }
      } catch {
        // fall through to recovery below
      }
      if (oldLogoIdKnown) await restoreOldAndDiscard(err, oldLogoIdKnown, priorDraftCleanupConfirmed)
      else await discardCandidate({ step: 'link-failed', error: err, priorDraftCleanupConfirmed })
    }
  }

  const finishSuccess = (fileId: string) => {
    setState({ step: 'done', fileId })
    onSuccessRef.current?.()
  }

  const replace = (file: File): void => {
    runIdRef.current += 1
    startRunIdRef.current = runIdRef.current
    newFileIdRef.current = null
    setState({ step: 'uploading', upload: { step: 'creating' } })
    // Failure is already tracked in useUploadFile's own state, surfaced via the effect below.
    void uploadFile.start(file, { tenant: tenantId, entityType: 'tenant', entityRelation: 'logo' }).catch(() => {})
  }

  // Syncs useUploadFile's state into our own while replace() is in flight; on 'done', hands off to
  // deactivate-old or link-new. Effect (not inline) so the async handoff never runs during render.
  // The runId check is defense-in-depth on top of useUploadFile's own guard — see runIdRef above.
  useEffect(() => {
    if (state.step !== 'uploading') return
    if (uploadFile.state.step === 'done') {
      if (runIdRef.current !== startRunIdRef.current) return
      newFileIdRef.current = uploadFile.state.fileId
      const priorDraftCleanupConfirmed = uploadFile.state.priorDraftCleanupConfirmed
      const oldLogoIdKnown = oldLogoIdRef.current
      if (oldLogoIdKnown) void deactivateOld(oldLogoIdKnown, priorDraftCleanupConfirmed)
      else void linkNew(priorDraftCleanupConfirmed)
      return
    }
    if (uploadFile.state !== state.upload) {
      setState({ step: 'uploading', upload: uploadFile.state })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadFile.state, state.step])

  // Abandons a still-in-flight upload (before the link stage) and best-effort discards it.
  // SAFETY: only acts while state.step === 'uploading', reading the file id from the NESTED
  // uploadFile.state — never newFileIdRef, which stays populated through link-attached-elsewhere
  // and would risk discarding a CONFIRMED FOREIGN entity's live file.
  const abandonPendingUpload = async (): Promise<AbandonResult> => {
    if (state.step !== 'uploading') return 'not-needed'
    // Bumps runIdRef so this run's own late completion (the network call isn't cancelled) can
    // never reach linkNew/deactivateOld — see startRunIdRef's comment on the sync effect above.
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
    // deactivate-failed/link-failed/link-conflict are excluded on purpose — the candidate is
    // already discarded by the time those show, so retrying would try to re-use it. replace() only.
    retry: async () => {
      const oldLogoIdKnown = oldLogoIdRef.current
      switch (state.step) {
        case 'deactivate-uncertain':
          if (oldLogoIdKnown) await deactivateOld(oldLogoIdKnown, state.priorDraftCleanupConfirmed)
          return
        case 'link-uncertain-checking':
          await linkNew(state.priorDraftCleanupConfirmed)
          return
        case 'restore-uncertain':
        case 'restore-failed':
          if (!oldLogoIdKnown) return
          // forFile routes retry to the SAME recovery path — attached-elsewhere must never
          // fall through to the discard-capable path.
          if (state.forFile === 'attached-elsewhere') {
            await restoreOldForAttachedElsewhere(state.linkError, oldLogoIdKnown, state.priorDraftCleanupConfirmed)
          } else {
            await restoreOldAndDiscard(state.linkError, oldLogoIdKnown, state.priorDraftCleanupConfirmed)
          }
          return
        default:
          return
      }
    },
  }
}

function withCleanup(state: ReplaceLogoState, cleanup: CleanupSubState): ReplaceLogoState {
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
