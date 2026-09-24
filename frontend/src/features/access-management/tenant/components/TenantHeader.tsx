import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { FiEdit2, FiRefreshCw, FiUpload } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import LogoPreview from '@/components/ui/LogoPreview'
import StartOverUploadDialog from '@/components/widgets/upload/StartOverUploadDialog'
import { useTenantLogo, tenantLogoKeys } from '@/features/access-management/tenant/hooks/useTenantLogo'
import { useReplaceTenantLogo, type ReplaceLogoState } from '@/features/access-management/tenant/hooks/useReplaceTenantLogo'
import { ACCEPTED_LOGO_MIME_TYPES, validateLogoFile } from '@/features/access-management/tenant/tenant.constants'
import { ROLE_ROUTES } from '@/features/access-management/role/role.routes'
import TenantTypeBadge from '@/features/access-management/tenant/components/TenantTypeBadge'
import TenantStatusPill from '@/features/access-management/tenant/components/TenantStatusPill'
import type { RolePopulatedUser, Tenant } from '@/types/accessManagement.types'

interface TenantHeaderProps {
  tenant: Tenant
  canManageTenant: boolean
  canViewRole: boolean
  ownerName: string | null
  ownerUser: RolePopulatedUser | null
  ownerEmailSuffix: string | null
  tenantAddress: string | null
  divisionPenetrationPct: number | null
  onEditClick: () => void
}

const ErrorBanner = ({ message }: { message: string }) => (
  <div className="text-[11px] rounded-lg px-2.5 py-1.5 bg-danger-soft border border-danger text-danger wrap-break-word">
    {message}
  </div>
)

// onRetry may reject (useUploadFile's steps re-throw after setting their own failure state) —
// React's onClick can't catch that, so this swallows both a sync throw and an async rejection.
function callSafely(fn: () => void): void {
  void Promise.resolve().then(fn).catch(() => {})
}

const RetryRow = ({ label, onRetry }: { label: string; onRetry: () => void }) => (
  <div className="flex flex-wrap items-center gap-2">
    <span className="text-[11px] text-danger wrap-break-word">{label}</span>
    <Button type="button" size="xs" variant="outline" onClick={() => callSafely(onRetry)}>
      <FiRefreshCw size={11} /> Retry
    </Button>
  </div>
)

const CleanupLine = ({ status, onRetry }: { status: 'cleanup-failed' | 'cleanup-uncertain'; onRetry: () => void }) => (
  <div className="flex flex-wrap items-center gap-2">
    <span className="text-[10.5px] wrap-break-word" style={{ color: 'var(--qms-text-muted)' }}>
      {status === 'cleanup-failed'
        ? "The failed upload couldn't be cleaned up."
        : "Cleanup of the failed upload is unconfirmed."}
    </span>
    <Button type="button" size="xs" variant="outline" onClick={() => callSafely(onRetry)}>
      Retry cleanup
    </Button>
  </div>
)

const TenantHeader = ({
  tenant,
  canManageTenant,
  canViewRole,
  ownerName,
  ownerUser,
  ownerEmailSuffix,
  tenantAddress,
  divisionPenetrationPct,
  onEditClick,
}: TenantHeaderProps) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { fileId, url, isLoading, isFetching, isError, refetch } = useTenantLogo(tenant.id)

  const invalidateLogo = () => {
    void queryClient.invalidateQueries({ queryKey: tenantLogoKeys.detail(tenant.id) })
  }

  const { state, replace, retryUpload, startOverUpload, retryCleanup, retry } = useReplaceTenantLogo(tenant.id, fileId, {
    onSuccess: invalidateLogo,
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  // Progressive disclosure: the "Start a new upload" fallback only appears once Try again has
  // already been tried once and failed again — not shown on the first failure.
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
    const error = validateLogoFile(picked)
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
  const readPriorDraftCleanupConfirmed = (s: ReplaceLogoState): boolean | null =>
    s.step === 'uploading'
      ? ('priorDraftCleanupConfirmed' in s.upload ? s.upload.priorDraftCleanupConfirmed : null)
      : s.step === 'cleaning-up-orphan'
        ? readPriorDraftCleanupConfirmed(s.primary)
        : ('priorDraftCleanupConfirmed' in s ? s.priorDraftCleanupConfirmed : null)
  const priorDraftCleanupConfirmed = readPriorDraftCleanupConfirmed(state)

  // These have no retry() case in the hook — must not count as busy, or the trigger stays disabled
  // forever with no path back.
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
        ? 'Removing old logo…'
        : state.step === 'linking-new'
          ? 'Linking logo…'
          : state.step === 'link-uncertain-checking'
            ? 'Checking upload status…'
            : state.step === 'restoring-old'
              ? 'Restoring previous logo…'
              : state.step === 'cleaning-up-orphan'
                ? 'Cleaning up…'
                : null

  // Plain array, not a fragment — a fragment is always "1 child" even when every conditional
  // inside it is falsy, so a fragment-based emptiness check would be structurally broken.
  const feedbackItems: ReactNode[] = []
  if (canManageTenant) {
    if (isError) {
      feedbackItems.push(
        <div key="fetch-error" className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-danger">Couldn't check the current logo.</span>
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
      feedbackItems.push(<RetryRow key="deactivate-uncertain" label="Couldn't confirm the old logo was removed." onRetry={retry} />)
    }
    if (state.step === 'deactivate-failed') {
      feedbackItems.push(
        <div key="deactivate-failed" className="flex flex-col gap-2">
          <ErrorBanner message="We couldn't replace the logo; this request did not modify the previous file." />
          {state.cleanup && <CleanupLine status={state.cleanup.status} onRetry={retryCleanup} />}
        </div>,
      )
    }
    if (state.step === 'link-conflict') {
      feedbackItems.push(
        <div key="link-conflict" className="flex flex-col gap-2">
          <ErrorBanner message="Another logo was just activated for this tenant." />
          {state.cleanup && <CleanupLine status={state.cleanup.status} onRetry={retryCleanup} />}
        </div>,
      )
    }
    if (state.step === 'link-failed') {
      feedbackItems.push(
        <div key="link-failed" className="flex flex-col gap-2">
          <ErrorBanner message="We couldn't link the new logo. Choose a file to try again." />
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
              ? "That file is already in use elsewhere and can't be linked here. Your previous logo has been kept. Choose a different file to try again."
              : "That file is already in use elsewhere and can't be linked here. Choose a different file to try again."
          }
        />,
      )
    }
    if (state.step === 'restore-uncertain') {
      feedbackItems.push(
        <div key="restore-uncertain" className="flex flex-col gap-2">
          <RetryRow label="Couldn't confirm the previous logo was restored." onRetry={retry} />
          {state.cleanup && <CleanupLine status={state.cleanup.status} onRetry={retryCleanup} />}
        </div>,
      )
    }
    if (state.step === 'restore-failed') {
      feedbackItems.push(
        <div key="restore-failed" className="flex flex-col gap-2">
          <ErrorBanner message="We couldn't restore the previous logo — a manual fix may be needed. Retrying won't necessarily fix this on its own." />
          {state.cleanup && <CleanupLine status={state.cleanup.status} onRetry={retryCleanup} />}
        </div>,
      )
    }
  }
  const hasLongFeedback = feedbackItems.length > 0

  return (
    <div
      className="rounded-xl border p-5 mb-5"
      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 min-w-0">
          <div className="flex flex-col items-center gap-2 w-32 shrink-0">
            <LogoPreview
              size="lg"
              alt="Company logo"
              src={canManageTenant ? (previewUrl ?? url) : url}
              isLoading={canManageTenant ? !previewUrl && (isLoading || isFetching) : isLoading || isFetching}
            />
            {canManageTenant && (
              <>
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
                {progressCaption && (
                  <p className="text-[11px] text-center" style={{ color: 'var(--qms-text-muted)' }}>
                    {progressCaption}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="min-w-0 max-w-[220px] sm:max-w-none text-center sm:text-left">
            <div className="text-lg font-bold truncate" style={{ color: 'var(--qms-text)' }}>
              {tenant.name}
            </div>
            <div className="text-[13px] truncate mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              {tenant.code}
            </div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <TenantTypeBadge type={tenant.type} />
              <TenantStatusPill status={tenant.status} />
            </div>
            {tenant.owner && (
              <div className="text-[11px] mt-3 wrap-break-word" style={{ color: 'var(--qms-text-muted)' }}>
                Owner:{' '}
                {canViewRole ? (
                  <button
                    onClick={() => navigate(ROLE_ROUTES.ROLE_DETAIL.replace(':id', tenant.owner as string))}
                    className="font-semibold underline underline-offset-2 hover:opacity-80"
                    style={{ color: 'var(--qms-text-soft)' }}
                  >
                    {ownerName ?? (ownerUser?.email ?? tenant.owner)}
                  </button>
                ) : (
                  <span className="font-semibold" style={{ color: 'var(--qms-text-soft)' }}>
                    {ownerName ?? tenant.owner}
                  </span>
                )}
                {ownerEmailSuffix && <span className="ml-1.5">({ownerEmailSuffix})</span>}
              </div>
            )}
            {tenantAddress && (
              <div className="text-[11px] mt-1.5 wrap-break-word" style={{ color: 'var(--qms-text-muted)' }}>
                Address: <span className="font-semibold" style={{ color: 'var(--qms-text-soft)' }}>{tenantAddress}</span>
              </div>
            )}
            {tenant.businessLifetime != null && (
              <div className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
                Business lifetime: <span className="font-semibold" style={{ color: 'var(--qms-text-soft)' }}>{tenant.businessLifetime} year{tenant.businessLifetime === 1 ? '' : 's'}</span>
              </div>
            )}
            {tenant.gst && (
              <div className="text-[11px] mt-1.5 wrap-break-word" style={{ color: 'var(--qms-text-muted)' }}>
                GST: <span className="font-semibold" style={{ color: 'var(--qms-text-soft)' }}>{tenant.gst}</span>
              </div>
            )}
            {divisionPenetrationPct !== null && (
              <div className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
                Division Penetration: <span className="font-semibold" style={{ color: 'var(--qms-text-soft)' }}>{divisionPenetrationPct}%</span>
              </div>
            )}
          </div>
        </div>

        <Button variant="outline" size="sm" className="shrink-0" onClick={onEditClick}>
          <FiEdit2 size={14} /> Edit client
        </Button>
      </div>

      {/* Row 2 — full card width, only rendered when there's genuinely long feedback content.
          A true sibling row, never nested in the w-32 column, so it can never force the first
          row wider. Independent of progressCaption — can render alongside an active caption. */}
      {hasLongFeedback && (
        <div className="mt-3 pt-3 border-t flex flex-col gap-2" style={{ borderColor: 'var(--qms-border)' }}>
          {feedbackItems}
        </div>
      )}

      <StartOverUploadDialog
        open={startOverDialogOpen}
        onOpenChange={setStartOverDialogOpen}
        onConfirm={() => {
          setStartOverDialogOpen(false)
          setHasRetriedThisAttempt(false)
          callSafely(startOverUpload)
        }}
      />
    </div>
  )
}

export default TenantHeader
