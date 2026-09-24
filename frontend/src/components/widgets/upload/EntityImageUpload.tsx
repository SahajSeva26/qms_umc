import { useEffect, useRef, useState, type ReactNode } from 'react'
import { FiRefreshCw, FiUpload } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import LogoPreview from '@/components/ui/LogoPreview'
import StartOverUploadDialog from '@/components/widgets/upload/StartOverUploadDialog'
import { ErrorBanner, RetryRow, CleanupLine } from '@/components/widgets/upload/UploadFeedbackRows'
import { callSafely } from '@/components/widgets/upload/callSafely'
import type { ReplaceFileState } from '@/hooks/useReplaceFile'

// Shared preview/upload/retry UI for a capped-relation file (tenant logo, profile picture). A hook,
// not a component, because callers place `column`/`feedback` at different points in their own layout.

export interface EntityImageUploadCopy {
  /** e.g. "Company logo" / "Profile picture" — used as the <img> alt text. */
  alt: string
  uploadLabel: string
  changeLabel: string
  /** e.g. "logo" / "picture" — substituted into most feedback-row messages below. */
  noun: string
  /** e.g. "the current logo" / "the current picture" — the direct object in "Couldn't check {noun}." */
  currentNoun: string
  /** e.g. "old logo" / "old picture" */
  oldNoun: string
  /** e.g. "new logo" / "new picture" */
  newNoun: string
  /** e.g. "previous logo" / "previous picture" */
  previousNoun: string
  /** Full sentence for the link-conflict state. Supplied whole, not templated — each entity needs
   * its own referent (e.g. "for this company" has no equivalent for a profile picture). */
  linkConflictMessage: string
  /** Full sentence for the restore-failed state. Supplied whole — whether "a manual fix" is possible
   * depends on whether an admin-override path exists, which differs per entity. */
  restoreFailedMessage: string
}

export interface EntityImageUploadReadState {
  fileId: string | null
  url: string | null
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  refetch: () => void
}

export type EntityImageUploadReplaceState = ReturnType<typeof import('@/hooks/useReplaceFile').useReplaceFile>

interface UseEntityImageUploadOptions {
  read: EntityImageUploadReadState
  replace: EntityImageUploadReplaceState
  size: 'sm' | 'lg'
  canManage: boolean
  copy: EntityImageUploadCopy
  /** file input `accept` attribute value, e.g. ACCEPTED_LOGO_MIME_TYPES.join(',') */
  accept: string
  /** Validates a picked file before upload starts; returns an error string or null. Never imported
   * by this hook directly — each caller supplies its own (tenant-logo vs. avatar limits may differ). */
  validateFile: (file: File) => string | null
}

export function useEntityImageUpload({ read, replace: flow, size, canManage, copy, accept, validateFile }: UseEntityImageUploadOptions) {
  const { fileId, url, isLoading, isFetching, isError, refetch } = read
  const { state, replace, retryUpload, startOverUpload, retryCleanup, retry } = flow

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  // Set true the moment "Try again" is clicked (before its outcome is known), so "Start a new
  // upload" appears once a retry has been attempted at all — not gated on that retry failing.
  const [hasRetriedThisAttempt, setHasRetriedThisAttempt] = useState(false)
  const [startOverDialogOpen, setStartOverDialogOpen] = useState(false)

  // Revoke the local object URL on unmount or whenever a new one replaces it.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const openFilePicker = () => {
    if (fileInputRef.current) fileInputRef.current.value = ''
    fileInputRef.current?.click()
  }

  const handleFilePicked = (picked: File | null) => {
    if (!picked) return
    const error = validateFile(picked)
    if (error) {
      // An invalid pick is a no-op from the upload state's perspective — must not hide a
      // fallback already earned from a prior failed attempt.
      setValidationError(error)
      return
    }
    setValidationError(null)
    setHasRetriedThisAttempt(false)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(picked))
    replace(picked)
  }

  // cleaning-up-orphan wraps its failure in `primary` instead of carrying this itself — read
  // through it (recursing once) or the sticky warning would flicker off during cleanup.
  const readPriorDraftCleanupConfirmed = (s: ReplaceFileState): boolean | null =>
    s.step === 'uploading'
      ? ('priorDraftCleanupConfirmed' in s.upload ? s.upload.priorDraftCleanupConfirmed : null)
      : s.step === 'cleaning-up-orphan'
        ? readPriorDraftCleanupConfirmed(s.primary)
        : ('priorDraftCleanupConfirmed' in s ? s.priorDraftCleanupConfirmed : null)
  const priorDraftCleanupConfirmed = readPriorDraftCleanupConfirmed(state)

  // Not "busy" — the trigger must stay enabled here, even for retry-eligible states like
  // restore-failed, or there'd be no path back to picking a fresh file.
  const isTerminalFailure =
    state.step === 'deactivate-failed' ||
    state.step === 'link-failed' ||
    state.step === 'link-conflict' ||
    state.step === 'link-attached-elsewhere' ||
    state.step === 'restore-failed'
  const isBusy = state.step !== 'idle' && state.step !== 'done' && !isTerminalFailure
  // isFetching too, not just isLoading — a background refetch can leave a stale cached fileId/url.
  const triggerDisabled = isLoading || isFetching || isError || isBusy

  // Independent from feedbackItems below — progress can show WHILE a warning is also visible.
  const progressCaption: string | null =
    state.step === 'uploading'
      ? state.upload.step === 'restarting'
        ? 'Starting a new upload…'
        : state.upload.step === 'uploading'
          ? 'Uploading…'
          : state.upload.step === 'creating'
            ? 'Starting upload…'
            : state.upload.step === 'activating'
              ? 'Confirming upload…'
              // activate-not-uploaded/activate-uncertain go through feedbackItems instead (RetryRow).
              : null
      : state.step === 'deactivating-old'
        ? `Removing ${copy.oldNoun}…`
        : state.step === 'linking-new'
          ? `Linking ${copy.noun}…`
          : state.step === 'link-uncertain-checking'
            ? 'Checking upload status…'
            : state.step === 'restoring-old'
              ? `Restoring ${copy.previousNoun}…`
              : state.step === 'cleaning-up-orphan'
                ? 'Cleaning up…'
                : null

  // Plain array, not a fragment — a fragment is always "1 child" even when every conditional
  // inside it is falsy, so a fragment-based emptiness check would be structurally broken.
  const feedbackItems: ReactNode[] = []
  if (canManage) {
    if (isError) {
      feedbackItems.push(
        <div key="fetch-error" className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-danger">{`Couldn't check ${copy.currentNoun}.`}</span>
          <Button type="button" size="xs" variant="outline" onClick={refetch}>
            <FiRefreshCw size={11} /> Retry
          </Button>
        </div>,
      )
    }
    if (validationError) {
      feedbackItems.push(<ErrorBanner key="validation-error" message={validationError} />)
    }
    if (state.step === 'uploading' && state.upload.step === 'upload-failed') {
      feedbackItems.push(
        <div key="upload-failed" className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => {
              setHasRetriedThisAttempt(true)
              callSafely(retryUpload)
            }}
          >
            Try again
          </Button>
          {hasRetriedThisAttempt && (
            <>
              <span className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                Still not working?
              </span>
              <Button type="button" size="xs" variant="link" onClick={() => setStartOverDialogOpen(true)}>
                Start a new upload
              </Button>
            </>
          )}
        </div>,
      )
    }
    if (state.step === 'uploading' && (state.upload.step === 'create-failed' || state.upload.step === 'create-uncertain')) {
      feedbackItems.push(<RetryRow key="create-failed" label="Couldn't start the upload." onRetry={retryUpload} />)
    }
    // All three activation failure/uncertain states — not just activate-failed.
    if (
      state.step === 'uploading' &&
      (state.upload.step === 'activate-failed' || state.upload.step === 'activate-not-uploaded' || state.upload.step === 'activate-uncertain')
    ) {
      feedbackItems.push(<RetryRow key="activate-failed" label="Couldn't confirm the upload." onRetry={retryUpload} />)
    }
    if (priorDraftCleanupConfirmed === false) {
      feedbackItems.push(
        <p key="cleanup-warning" className="text-[10.5px] wrap-break-word" style={{ color: 'var(--qms-text-muted)' }}>
          Your previous draft upload couldn't be confirmed as cleaned up.
        </p>,
      )
    }
    if (state.step === 'deactivate-uncertain') {
      feedbackItems.push(<RetryRow key="deactivate-uncertain" label={`Couldn't confirm the ${copy.oldNoun} was removed.`} onRetry={retry} />)
    }
    if (state.step === 'deactivate-failed') {
      feedbackItems.push(
        <div key="deactivate-failed" className="flex flex-col gap-2">
          <ErrorBanner message={`We couldn't replace the ${copy.noun}; this request did not modify the previous file.`} />
          {state.cleanup && <CleanupLine status={state.cleanup.status} onRetry={retryCleanup} />}
        </div>,
      )
    }
    if (state.step === 'link-conflict') {
      feedbackItems.push(
        <div key="link-conflict" className="flex flex-col gap-2">
          <ErrorBanner message={copy.linkConflictMessage} />
          {state.cleanup && <CleanupLine status={state.cleanup.status} onRetry={retryCleanup} />}
        </div>,
      )
    }
    if (state.step === 'link-failed') {
      feedbackItems.push(
        <div key="link-failed" className="flex flex-col gap-2">
          <ErrorBanner message={`We couldn't link the ${copy.newNoun}. Choose a file to try again.`} />
          {state.cleanup && <CleanupLine status={state.cleanup.status} onRetry={retryCleanup} />}
        </div>,
      )
    }
    if (state.step === 'link-attached-elsewhere') {
      feedbackItems.push(
        <ErrorBanner
          key="link-attached-elsewhere"
          message={
            state.hadOldLogo
              ? `That file is already in use elsewhere and can't be linked here. Your ${copy.previousNoun} has been kept. Choose a different file to try again.`
              : "That file is already in use elsewhere and can't be linked here. Choose a different file to try again."
          }
        />,
      )
    }
    if (state.step === 'restore-uncertain') {
      feedbackItems.push(
        <div key="restore-uncertain" className="flex flex-col gap-2">
          <RetryRow label={`Couldn't confirm the ${copy.previousNoun} was restored.`} onRetry={retry} />
          {state.cleanup && <CleanupLine status={state.cleanup.status} onRetry={retryCleanup} />}
        </div>,
      )
    }
    if (state.step === 'restore-failed') {
      feedbackItems.push(
        <div key="restore-failed" className="flex flex-col gap-2">
          <ErrorBanner message={copy.restoreFailedMessage} />
          {state.cleanup && <CleanupLine status={state.cleanup.status} onRetry={retryCleanup} />}
        </div>,
      )
    }
  }
  const hasLongFeedback = feedbackItems.length > 0

  const column: ReactNode = (
    <div className="flex flex-col items-center gap-2 w-32 shrink-0">
      <LogoPreview
        size={size}
        alt={copy.alt}
        src={canManage ? (previewUrl ?? url) : url}
        isLoading={canManage ? !previewUrl && (isLoading || isFetching) : isLoading || isFetching}
      />
      {canManage && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => handleFilePicked(e.target.files?.[0] ?? null)}
          />
          <Button type="button" size="sm" variant="outline" onClick={openFilePicker} disabled={triggerDisabled}>
            <FiUpload size={13} /> {url || fileId ? copy.changeLabel : copy.uploadLabel}
          </Button>
          {progressCaption && (
            <p className="text-[11px] text-center" style={{ color: 'var(--qms-text-muted)' }}>
              {progressCaption}
            </p>
          )}
        </>
      )}
    </div>
  )

  // null when there's nothing to show, so callers can render `{feedback}` directly with no extra
  // check — the caller supplies its own border/spacing for placement (this div has neither).
  const feedback: ReactNode = hasLongFeedback ? (
    <div className="w-full flex flex-col gap-2 text-left">
      {feedbackItems}
    </div>
  ) : null

  const startOverDialog: ReactNode = (
    <StartOverUploadDialog
      open={startOverDialogOpen}
      onOpenChange={setStartOverDialogOpen}
      onConfirm={() => {
        setStartOverDialogOpen(false)
        setHasRetriedThisAttempt(false)
        callSafely(startOverUpload)
      }}
    />
  )

  return { column, feedback, hasLongFeedback, startOverDialog }
}
