import { useEffect, useRef, useState, type ReactNode } from 'react'
import { FiRefreshCw, FiUpload } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import LogoPreview from '@/components/ui/LogoPreview'
import { ErrorBanner, RetryRow } from '@/components/widgets/upload/UploadFeedbackRows'
import { callSafely } from '@/components/widgets/upload/callSafely'
import { useTenantLogo, tenantLogoKeys } from '@/features/access-management/tenant/hooks/useTenantLogo'
import { useTenantLogoUpload } from '@/features/access-management/tenant/hooks/useTenantLogoUpload'
import { ACCEPTED_LOGO_MIME_TYPES, validateLogoFile } from '@/features/access-management/tenant/tenant.constants'
import { useQueryClient } from '@tanstack/react-query'

// Presentational wiring for TenantHeader's logo column — mirrors EntityImageUpload's shape, but
// against the smaller tenant-logo state machine (no deactivate-old/link/restore states).

interface UseTenantLogoFieldOptions {
  tenantId: string
  canManage: boolean
}

export function useTenantLogoField({ tenantId, canManage }: UseTenantLogoFieldOptions) {
  const queryClient = useQueryClient()
  const logo = useTenantLogo(tenantId)
  const { fileId, url, isLoading, isFetching, isError, refetch } = logo

  const invalidateLogo = () => {
    void queryClient.invalidateQueries({ queryKey: tenantLogoKeys.detail(tenantId) })
  }
  const { state, upload, retry } = useTenantLogoUpload(tenantId, { onSuccess: invalidateLogo })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

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
    upload(picked)
  }

  const isTerminalFailure = state.step === 'activate-rejected'
  const isBusy = state.step !== 'idle' && state.step !== 'done' && !isTerminalFailure
  const isUploadPending = state.step === 'creating' || state.step === 'uploading' || state.step === 'activating'
  const triggerDisabled = isLoading || isFetching || isError || isBusy

  const progressCaption: string | null =
    state.step === 'creating'
      ? 'Starting upload…'
      : state.step === 'uploading'
        ? 'Uploading…'
        : state.step === 'activating'
          ? 'Confirming upload…'
          : state.step === 'activate-uncertain'
            ? 'Checking upload status…'
            : null

  const feedbackItems: ReactNode[] = []
  if (canManage) {
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
    if (state.step === 'create-failed' || state.step === 'create-uncertain') {
      feedbackItems.push(<RetryRow key="create-failed" label="Couldn't start the upload." onRetry={() => callSafely(retry)} />)
    }
    if (state.step === 'upload-failed') {
      feedbackItems.push(<RetryRow key="upload-failed" label="Couldn't upload the logo." onRetry={() => callSafely(retry)} />)
    }
    if (state.step === 'activate-failed' || state.step === 'activate-uncertain') {
      feedbackItems.push(<RetryRow key="activate-failed" label="Couldn't confirm the upload." onRetry={() => callSafely(retry)} />)
    }
    if (state.step === 'activate-rejected') {
      feedbackItems.push(<ErrorBanner key="activate-rejected" message="That upload could not be linked to this logo. Choose a file to try again." />)
    }
  }
  const hasLongFeedback = feedbackItems.length > 0

  const column: ReactNode = (
    <div className="flex flex-col items-center gap-2 w-32 shrink-0">
      <LogoPreview
        size="lg"
        alt="Company logo"
        src={canManage && isUploadPending ? (previewUrl ?? url) : url}
        isLoading={canManage ? !previewUrl && (isLoading || isFetching) : isLoading || isFetching}
      />
      {canManage && (
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
  )

  const feedback: ReactNode = hasLongFeedback ? (
    <div className="w-full flex flex-col gap-2 text-left">{feedbackItems}</div>
  ) : null

  return { column, feedback, hasLongFeedback }
}
