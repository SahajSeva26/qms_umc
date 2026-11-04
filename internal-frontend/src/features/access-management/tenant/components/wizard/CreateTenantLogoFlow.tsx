import { FiRefreshCw, FiUpload } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import LogoPreview from '@/components/ui/LogoPreview'
import { ACCEPTED_LOGO_MIME_TYPES } from '@/features/access-management/tenant/tenant.constants'
import { Label } from '@/components/ui/label'
import type { CreateTenantLogoFlowApi } from '@/features/access-management/tenant/hooks/useCreateTenantLogoFlow'

interface CreateTenantLogoFlowProps {
  flow: CreateTenantLogoFlowApi
  variant: 'picker' | 'status'
}

// Swallows a sync throw or async rejection — onClick can't await/catch a handler's return value.
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
    retryLogo,
    isTerminalFailure,
    isRetryable,
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
            {logoState.step === 'creating' && 'Starting upload…'}
            {logoState.step === 'uploading' && 'Uploading logo…'}
            {logoState.step === 'activating' && 'Confirming upload…'}
            {logoState.step === 'activate-uncertain' && 'Checking upload status…'}
            {isRetryable(logoState.step) && "We couldn't confirm the logo upload — you can retry or continue without it."}
            {isTerminalFailure(logoState.step) && "We couldn't attach the logo to the new company."}
          </p>
        </div>

        {/* Also needed here, not just the picker variant, or a rejected replacement fails silently. */}
        {logoValidationError && <p className="text-[11px] text-danger">{logoValidationError}</p>}

        {isRetryable(logoState.step) && (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="xs" variant="outline" onClick={() => callSafely(() => void retryLogo())}>
              <FiRefreshCw size={11} /> Retry
            </Button>
            <Button type="button" size="xs" variant="ghost" onClick={finishWithoutLogo}>
              Continue without logo
            </Button>
          </div>
        )}

        {isTerminalFailure(logoState.step) && (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="xs" variant="outline" onClick={openLogoPicker}>
              Choose another logo
            </Button>
            <Button type="button" size="xs" variant="ghost" onClick={finishWithoutLogo}>
              Continue without logo
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default CreateTenantLogoFlow
