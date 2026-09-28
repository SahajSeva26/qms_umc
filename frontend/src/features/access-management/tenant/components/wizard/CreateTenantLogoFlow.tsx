import { FiRefreshCw, FiUpload } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import LogoPreview from '@/components/ui/LogoPreview'
import StartOverUploadDialog from '@/components/widgets/upload/StartOverUploadDialog'
import { ACCEPTED_LOGO_MIME_TYPES } from '@/features/access-management/tenant/tenant.constants'
import { Label } from '@/components/ui/label'
import type { CreateTenantLogoFlowApi } from '@/features/access-management/tenant/hooks/useCreateTenantLogoFlow'

interface CreateTenantLogoFlowProps {
  flow: CreateTenantLogoFlowApi
  variant: 'picker' | 'status'
}

// Swallows a sync throw or async rejection — useUploadFile's steps re-throw after failing, and
// onClick can't await/catch a handler's return value. Mirrors TenantHeader.tsx's own callSafely.
function callSafely(fn: () => void): void {
  void Promise.resolve().then(fn).catch(() => {})
}

// Rendered at two sites sharing one flow instance. Destructured (not accessed as flow.x) since
// flow.logoFileInputRef is a ref — the lint rule flags every flow.x access otherwise.
const CreateTenantLogoFlow = ({ flow, variant }: CreateTenantLogoFlowProps) => {
  const {
    isPostCreateFlowActive,
    pickedLogoFile,
    logoPreviewUrl,
    logoValidationError,
    logoFileInputRef,
    openLogoPicker,
    handleLogoPicked,
    logoState,
    retryLogoUpload,
    startOverLogoUpload,
    retryLogoCleanup,
    retryLogo,
    hasRetriedThisAttempt,
    setHasRetriedThisAttempt,
    startOverDialogOpen,
    setStartOverDialogOpen,
    inFlightUploadStep,
    uploadStalled,
    awaitingAbandonAck,
    isTopLevelTerminalFailure,
    isTopLevelRetryable,
    continueWithoutLogo,
    finishWithoutLogo,
  } = flow

  if (variant === 'picker') {
    return (
      <div>
        <Label className="text-xs mb-1.5">Logo (optional)</Label>
        <div className="flex items-center gap-3">
          <LogoPreview size="sm" alt="Company logo preview" src={logoPreviewUrl} />
          <input
            ref={logoFileInputRef}
            type="file"
            accept={ACCEPTED_LOGO_MIME_TYPES.join(',')}
            className="hidden"
            onChange={(e) => handleLogoPicked(e.target.files?.[0] ?? null)}
          />
          <Button type="button" size="sm" variant="outline" onClick={openLogoPicker} disabled={isPostCreateFlowActive}>
            <FiUpload size={13} /> {pickedLogoFile ? 'Change logo' : 'Upload logo'}
          </Button>
        </div>
        {logoValidationError && <p className="text-[11px] mt-1 text-danger">{logoValidationError}</p>}
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
        Company created
      </h3>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <LogoPreview size="sm" alt="Company logo preview" src={logoPreviewUrl} />
          {/* Also needed here, not just the picker variant — that markup unmounts post-create,
              which would leave "Choose another logo"'s ref null. */}
          <input
            ref={logoFileInputRef}
            type="file"
            accept={ACCEPTED_LOGO_MIME_TYPES.join(',')}
            className="hidden"
            onChange={(e) => handleLogoPicked(e.target.files?.[0] ?? null)}
          />
          <p className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
            {logoState.step === 'uploading' && logoState.upload.step === 'uploading' && 'Uploading logo…'}
            {logoState.step === 'uploading' && logoState.upload.step === 'activating' && 'Confirming upload…'}
            {logoState.step === 'uploading' && logoState.upload.step === 'creating' && 'Starting upload…'}
            {logoState.step === 'uploading' && logoState.upload.step === 'restarting' && 'Starting a new upload…'}
            {logoState.step === 'uploading' && logoState.upload.step === 'upload-failed' && "The upload didn't go through."}
            {logoState.step === 'deactivating-old' && 'Preparing…'}
            {logoState.step === 'linking-new' && 'Linking logo…'}
            {logoState.step === 'link-uncertain-checking' && 'Checking upload status…'}
            {logoState.step === 'restoring-old' && 'Finishing up…'}
            {logoState.step === 'cleaning-up-orphan' && 'Cleaning up…'}
            {isTopLevelRetryable(logoState.step) && "We couldn't confirm the logo upload — you can retry or continue without it."}
            {isTopLevelTerminalFailure(logoState.step) && "We couldn't attach the logo to the new company."}
          </p>
        </div>

        {/* Also needed here, not just the picker variant, or a rejected replacement fails silently. */}
        {logoValidationError && <p className="text-[11px] text-danger">{logoValidationError}</p>}

        {/* Nested upload sub-state actions (create/upload/activate) — the only states where
            abandonPendingUpload() is ever called; see useReplaceTenantLogo.ts. */}
        {logoState.step === 'uploading' && (
          <div className="flex flex-wrap items-center gap-2">
            {logoState.upload.step === 'upload-failed' && (
              <>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => {
                    setHasRetriedThisAttempt(true)
                    callSafely(retryLogoUpload)
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
                <Button type="button" size="xs" variant="ghost" onClick={() => void continueWithoutLogo()}>
                  Continue without logo
                </Button>
              </>
            )}
            {(logoState.upload.step === 'create-failed' ||
              logoState.upload.step === 'create-uncertain' ||
              logoState.upload.step === 'activate-failed' ||
              logoState.upload.step === 'activate-not-uploaded' ||
              logoState.upload.step === 'activate-uncertain') && (
              <>
                <Button type="button" size="xs" variant="outline" onClick={() => callSafely(retryLogoUpload)}>
                  <FiRefreshCw size={11} /> Retry
                </Button>
                <Button type="button" size="xs" variant="ghost" onClick={() => void continueWithoutLogo()}>
                  Continue without logo
                </Button>
              </>
            )}
            {inFlightUploadStep && uploadStalled && (
              <>
                <span className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                  Still taking a while?
                </span>
                <Button type="button" size="xs" variant="ghost" onClick={() => void continueWithoutLogo()}>
                  Continue without logo
                </Button>
              </>
            )}
          </div>
        )}

        <StartOverUploadDialog
          open={startOverDialogOpen}
          onOpenChange={setStartOverDialogOpen}
          onConfirm={() => {
            setStartOverDialogOpen(false)
            setHasRetriedThisAttempt(false)
            callSafely(startOverLogoUpload)
          }}
        />

        {/* Top-level (post-link-stage) retryable states. */}
        {isTopLevelRetryable(logoState.step) && (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="xs" variant="outline" onClick={() => callSafely(retryLogo)}>
              <FiRefreshCw size={11} /> Retry
            </Button>
            {'cleanup' in logoState && logoState.cleanup && (
              <Button type="button" size="xs" variant="outline" onClick={() => callSafely(retryLogoCleanup)}>
                Retry cleanup
              </Button>
            )}
            <Button type="button" size="xs" variant="ghost" onClick={finishWithoutLogo}>
              Continue without logo
            </Button>
          </div>
        )}

        {/* Terminal failures — Continue is ALWAYS a plain close, recovery already ran. */}
        {isTopLevelTerminalFailure(logoState.step) && (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="xs" variant="outline" onClick={openLogoPicker}>
              Choose another logo
            </Button>
            {'cleanup' in logoState && logoState.cleanup && (
              <Button type="button" size="xs" variant="outline" onClick={() => callSafely(retryLogoCleanup)}>
                Retry cleanup
              </Button>
            )}
            <Button type="button" size="xs" variant="ghost" onClick={finishWithoutLogo}>
              Continue without logo
            </Button>
          </div>
        )}

        {/* Only reachable via the upload-substate "Continue without logo", never the top-level one. */}
        {awaitingAbandonAck && (
          <div className="text-[11px] rounded-lg px-2.5 py-1.5 bg-danger-soft border border-danger text-danger">
            Company created. We couldn't confirm the logo upload was cleaned up.
            <Button type="button" size="xs" variant="outline" className="ml-2" onClick={finishWithoutLogo}>
              Continue anyway
            </Button>
          </div>
        )}

        {/* Sticky-false cleanup (see useUploadFile.ts) — done-effect refuses to auto-close past this. */}
        {logoState.step === 'done' && logoState.priorDraftCleanupConfirmed === false && (
          <div className="text-[11px] rounded-lg px-2.5 py-1.5 bg-danger-soft border border-danger text-danger">
            Company created and logo attached. We couldn't confirm an earlier failed upload was cleaned up.
            <Button type="button" size="xs" variant="outline" className="ml-2" onClick={finishWithoutLogo}>
              Continue anyway
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default CreateTenantLogoFlow
