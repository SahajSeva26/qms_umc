import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FiImage, FiRefreshCw, FiUpload } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { useTenantLogo, tenantLogoKeys } from '@/features/access-management/tenant/hooks/useTenantLogo'
import { useReplaceTenantLogo, type ReplaceLogoState } from '@/features/access-management/tenant/hooks/useReplaceTenantLogo'
import { ACCEPTED_LOGO_MIME_TYPES, validateLogoFile } from '@/features/access-management/tenant/tenant.constants'

// Reads whichever step the combined state is currently in, so the caption can render across the
// whole post-upload window, not just the one render 'done' briefly appears on.
function priorDraftCleanupConfirmedOf(state: ReplaceLogoState): boolean | null {
  return 'priorDraftCleanupConfirmed' in state ? state.priorDraftCleanupConfirmed : null
}

interface TenantLogoUploaderProps {
  tenantId: string
  canManage: boolean
}

const ErrorBanner = ({ message }: { message: string }) => (
  <div className="text-[11px] rounded-lg px-2.5 py-1.5 bg-danger-soft border border-danger text-danger mt-2">
    {message}
  </div>
)

// onRetry may reject (useUploadFile's steps re-throw after setting their own failure state) —
// React's onClick can't catch that, so this swallows both a sync throw and an async rejection.
function callSafely(fn: () => void): void {
  void Promise.resolve().then(fn).catch(() => {})
}

const RetryRow = ({ label, onRetry }: { label: string; onRetry: () => void }) => (
  <div className="flex items-center gap-2 mt-2">
    <span className="text-[11px] text-danger">{label}</span>
    <Button type="button" size="xs" variant="outline" onClick={() => callSafely(onRetry)}>
      <FiRefreshCw size={11} /> Retry
    </Button>
  </div>
)

const CleanupLine = ({ status, onRetry }: { status: 'cleanup-failed' | 'cleanup-uncertain'; onRetry: () => void }) => (
  <div className="flex items-center gap-2 mt-1.5">
    <span className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>
      {status === 'cleanup-failed'
        ? "The failed upload couldn't be cleaned up."
        : "Cleanup of the failed upload is unconfirmed."}
    </span>
    <Button type="button" size="xs" variant="outline" onClick={() => callSafely(onRetry)}>
      Retry cleanup
    </Button>
  </div>
)

const TenantLogoUploader = ({ tenantId, canManage }: TenantLogoUploaderProps) => {
  const queryClient = useQueryClient()
  const { fileId, url, isLoading, isFetching, isError, refetch } = useTenantLogo(tenantId)

  const invalidateLogo = () => {
    void queryClient.invalidateQueries({ queryKey: tenantLogoKeys.detail(tenantId) })
  }

  const { state, replace, retryUpload, startOverUpload, retryCleanup, retry } = useReplaceTenantLogo(tenantId, fileId, {
    onSuccess: invalidateLogo,
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

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
    const error = validateLogoFile(picked)
    if (error) {
      setValidationError(error)
      return
    }
    setValidationError(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(picked))
    replace(picked)
  }

  const priorDraftCleanupConfirmed = priorDraftCleanupConfirmedOf(state)
  // These have no retry() case in the hook — must not count as busy, or the trigger stays disabled
  // forever with no path back.
  const isTerminalFailure =
    state.step === 'deactivate-failed' ||
    state.step === 'link-failed' ||
    state.step === 'link-conflict' ||
    state.step === 'link-attached-elsewhere' ||
    state.step === 'restore-failed'
  const isBusy = state.step !== 'idle' && state.step !== 'done' && !isTerminalFailure
  // isFetching (not just isLoading) — a background refetch of already-cached data must also
  // block actions, since the cached fileId/url could be stale (expired presigned URL, or an
  // old-logo id that's since been replaced) until the refetch resolves.
  const triggerDisabled = isLoading || isFetching || isError || isBusy

  if (!canManage) {
    return (
      <div
        className="w-16 h-16 rounded-xl border shrink-0 flex items-center justify-center overflow-hidden"
        style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-strong)' }}
      >
        {isLoading || isFetching ? (
          <span className="text-[9px]" style={{ color: 'var(--qms-text-muted)' }}>…</span>
        ) : url ? (
          <img src={url} alt="Company logo" className="w-full h-full object-contain" />
        ) : (
          <FiImage size={20} style={{ color: 'var(--qms-text-muted)' }} />
        )}
      </div>
    )
  }

  return (
    <div className="shrink-0">
      <div className="flex items-start gap-3">
        <div
          className="w-16 h-16 rounded-xl border shrink-0 flex items-center justify-center overflow-hidden"
          style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-strong)' }}
        >
          {previewUrl ? (
            // A local object URL for a just-picked file — never stale from the server, so it
            // always takes priority, including during a background refetch of the old url.
            <img src={previewUrl} alt="Company logo" className="w-full h-full object-contain" />
          ) : isLoading || isFetching ? (
            <span className="text-[9px]" style={{ color: 'var(--qms-text-muted)' }}>…</span>
          ) : url ? (
            <img src={url} alt="Company logo" className="w-full h-full object-contain" />
          ) : (
            <FiImage size={20} style={{ color: 'var(--qms-text-muted)' }} />
          )}
        </div>

        <div>
          {isError && (
            <div className="mb-1.5">
              <span className="text-[11px] text-danger">Couldn't check the current logo.</span>
              <Button type="button" size="xs" variant="outline" className="ml-2" onClick={refetch}>
                <FiRefreshCw size={11} /> Retry
              </Button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_LOGO_MIME_TYPES.join(',')}
            className="hidden"
            onChange={(e) => handleFilePicked(e.target.files?.[0] ?? null)}
          />
          <Button type="button" size="sm" variant="outline" onClick={openFilePicker} disabled={triggerDisabled}>
            <FiUpload size={13} /> {url || fileId ? 'Change logo' : 'Upload logo'}
          </Button>

          {validationError && <ErrorBanner message={validationError} />}

          {state.step === 'uploading' && (
            <div className="mt-2">
              <p className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                {state.upload.step === 'uploading' ? 'Uploading…' : 'Confirming upload…'}
              </p>
              {state.upload.step === 'upload-failed' && (
                <div className="flex items-center gap-2 mt-1.5">
                  <Button type="button" size="xs" variant="outline" onClick={() => callSafely(retryUpload)}>
                    Retry upload
                  </Button>
                  <Button type="button" size="xs" variant="outline" onClick={() => callSafely(startOverUpload)}>
                    Start over
                  </Button>
                </div>
              )}
              {(state.upload.step === 'create-failed' || state.upload.step === 'create-uncertain') && (
                <RetryRow label="Couldn't start the upload." onRetry={retryUpload} />
              )}
              {(state.upload.step === 'activate-failed' ||
                state.upload.step === 'activate-not-uploaded' ||
                state.upload.step === 'activate-uncertain') && (
                <RetryRow label="Couldn't confirm the upload." onRetry={retryUpload} />
              )}
            </div>
          )}

          {priorDraftCleanupConfirmed === false && (
            <p className="text-[10.5px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
              Your previous draft upload couldn't be confirmed as cleaned up.
            </p>
          )}

          {state.step === 'deactivating-old' && (
            <p className="text-[11px] mt-2" style={{ color: 'var(--qms-text-muted)' }}>Removing old logo…</p>
          )}

          {state.step === 'deactivate-uncertain' && (
            <RetryRow label="Couldn't confirm the old logo was removed." onRetry={retry} />
          )}

          {state.step === 'deactivate-failed' && (
            <>
              <ErrorBanner message="We couldn't replace the logo; this request did not modify the previous file." />
              {state.cleanup && <CleanupLine status={state.cleanup.status} onRetry={retryCleanup} />}
            </>
          )}

          {state.step === 'linking-new' && (
            <p className="text-[11px] mt-2" style={{ color: 'var(--qms-text-muted)' }}>Linking new logo…</p>
          )}

          {state.step === 'link-uncertain-checking' && (
            <p className="text-[11px] mt-2" style={{ color: 'var(--qms-text-muted)' }}>Checking upload status…</p>
          )}

          {state.step === 'link-conflict' && (
            <>
              <ErrorBanner message="Another logo was just activated for this tenant." />
              {state.cleanup && <CleanupLine status={state.cleanup.status} onRetry={retryCleanup} />}
            </>
          )}

          {state.step === 'link-failed' && (
            <>
              <ErrorBanner message="We couldn't link the new logo. Choose a file to try again." />
              {state.cleanup && <CleanupLine status={state.cleanup.status} onRetry={retryCleanup} />}
            </>
          )}

          {state.step === 'link-attached-elsewhere' && (
            <ErrorBanner
              message={
                state.hadOldLogo
                  ? "That file is already in use elsewhere and can't be linked here. Your previous logo has been kept. Choose a different file to try again."
                  : "That file is already in use elsewhere and can't be linked here. Choose a different file to try again."
              }
            />
          )}

          {state.step === 'restoring-old' && (
            <p className="text-[11px] mt-2" style={{ color: 'var(--qms-text-muted)' }}>Restoring previous logo…</p>
          )}

          {state.step === 'restore-uncertain' && (
            <>
              <RetryRow label="Couldn't confirm the previous logo was restored." onRetry={retry} />
              {state.cleanup && <CleanupLine status={state.cleanup.status} onRetry={retryCleanup} />}
            </>
          )}

          {state.step === 'restore-failed' && (
            <>
              <ErrorBanner message="We couldn't restore the previous logo — a manual fix may be needed. Retrying won't necessarily fix this on its own." />
              {state.cleanup && <CleanupLine status={state.cleanup.status} onRetry={retryCleanup} />}
            </>
          )}

          {state.step === 'cleaning-up-orphan' && (
            <p className="text-[11px] mt-2" style={{ color: 'var(--qms-text-muted)' }}>Cleaning up…</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default TenantLogoUploader
