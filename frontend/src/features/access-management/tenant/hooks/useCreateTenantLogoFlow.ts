import { useEffect, useRef, useState } from 'react'
import { useReplaceTenantLogo } from '@/features/access-management/tenant/hooks/useReplaceTenantLogo'
import { validateLogoFile } from '@/features/access-management/tenant/tenant.constants'

export interface UseCreateTenantLogoFlowOptions {
  // Called once the logo flow (or an acknowledged abandon) is genuinely finished — the
  // coordinator's version resets the whole dialog and navigates to the new tenant.
  onDone: (tenantId: string) => void
}

// Owns the post-create logo-upload state machine: pick -> upload -> activate -> link (never a
// deactivate-old step — a just-created tenant has no prior logo) -> recover-on-failure -> stall/
// abandon handling -> close guard.
export function useCreateTenantLogoFlow({ onDone }: UseCreateTenantLogoFlowOptions) {
  // Logo-during-create: plain local state, not react-hook-form — applied as a separate step once
  // the tenant actually exists, not part of the Zod-validated CreateTenantPayload.
  const [pickedLogoFile, setPickedLogoFile] = useState<File | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)
  const [logoValidationError, setLogoValidationError] = useState<string | null>(null)
  const logoFileInputRef = useRef<HTMLInputElement>(null)
  // Set the instant POST /tenants succeeds when a logo was picked; null = no tenant yet, or no
  // logo picked (the unchanged, close-immediately path).
  const [createdTenantId, setCreatedTenantId] = useState<string | null>(null)
  // Active for the whole post-create upload flow — drives the close-guard and disables the
  // original form/footer controls, independent of useReplaceTenantLogo's own state.
  const isPostCreateFlowActive = createdTenantId !== null
  // Keyed by tenant id, not a bare boolean — this dialog never unmounts between opens (Dialog is
  // controlled via `open`), so a bare flag would only ever fire once per page session.
  const startedForTenantIdRef = useRef<string | null>(null)
  // Guards a stale 'done' from a PRIOR cycle still showing for one render after a new replace()
  // starts (useReplaceTenantLogo's state isn't reset on tenantId change) — see "done" effect below.
  const hasLeftDoneSinceStartRef = useRef(true)
  // These terminal/retryable states already ran their own recovery — Continue is a plain close.
  const isTopLevelTerminalFailure = (step: string) =>
    step === 'deactivate-failed' || step === 'link-failed' || step === 'link-conflict' || step === 'link-attached-elsewhere'
  const isTopLevelRetryable = (step: string) =>
    step === 'deactivate-uncertain' || step === 'link-uncertain-checking' || step === 'restore-uncertain' || step === 'restore-failed'

  const {
    state: logoState,
    replace: replaceLogo,
    retryUpload: retryLogoUpload,
    startOverUpload: startOverLogoUpload,
    retryCleanup: retryLogoCleanup,
    retry: retryLogo,
    abandonPendingUpload,
  } = useReplaceTenantLogo(createdTenantId ?? '', null, { onSuccess: () => {} })

  // Set when abandonPendingUpload() resolves unconfirmed/unavailable — holds the close+navigate
  // until acknowledged, since a message in a closing dialog would never be read.
  const [awaitingAbandonAck, setAwaitingAbandonAck] = useState(false)
  // Progressive disclosure: the "Start a new upload" fallback only appears once Try again has
  // already been tried once and failed again — not shown on the first failure.
  const [hasRetriedThisAttempt, setHasRetriedThisAttempt] = useState(false)
  const [startOverDialogOpen, setStartOverDialogOpen] = useState(false)

  // The only place replace() is called from — keeps hasLeftDoneSinceStartRef's reset consistent
  // across every call site.
  const startLogoUpload = (file: File) => {
    hasLeftDoneSinceStartRef.current = false
    replaceLogo(file)
  }

  // Revoke the local preview URL on unmount or replacement.
  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl)
    }
  }, [logoPreviewUrl])

  const openLogoPicker = () => {
    if (logoFileInputRef.current) logoFileInputRef.current.value = ''
    logoFileInputRef.current?.click()
  }

  const handleLogoPicked = (picked: File | null) => {
    if (!picked) return
    const error = validateLogoFile(picked)
    if (error) {
      // An invalid pick is a no-op from the upload state's perspective — must not hide a
      // fallback already earned from a prior failed attempt.
      setLogoValidationError(error)
      return
    }
    setLogoValidationError(null)
    setHasRetriedThisAttempt(false)
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl)
    setLogoPreviewUrl(URL.createObjectURL(picked))
    setPickedLogoFile(picked)
    // If the tenant already exists ("Choose another logo" after a failure), start immediately.
    if (createdTenantId) startLogoUpload(picked)
  }

  // Fires once BOTH the real tenant id and picked file are known — never called synchronously
  // from onSubmit's onSuccess, since replace() would still close over the stale, empty id.
  useEffect(() => {
    if (!createdTenantId || !pickedLogoFile) return
    if (startedForTenantIdRef.current === createdTenantId) return
    startedForTenantIdRef.current = createdTenantId
    startLogoUpload(pickedLogoFile)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdTenantId, pickedLogoFile])

  // Tracks whether logoState has moved off 'done' at least once since the most recent
  // startLogoUpload() call — see hasLeftDoneSinceStartRef's own comment for why this is needed.
  useEffect(() => {
    if (logoState.step !== 'done') {
      hasLeftDoneSinceStartRef.current = true
    }
  }, [logoState.step])

  const inFlightUploadStep =
    logoState.step === 'uploading' &&
    (logoState.upload.step === 'creating' || logoState.upload.step === 'uploading' || logoState.upload.step === 'activating')
      ? logoState.upload.step
      : null
  // No failure UI exists during a genuinely in-flight step, and the dialog can't be closed either
  // — surface an escape hatch after a stall so a hung request doesn't trap the user.
  const [uploadStalled, setUploadStalled] = useState(false)
  useEffect(() => {
    if (!inFlightUploadStep) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUploadStalled(false)
      return
    }
    const timer = setTimeout(() => setUploadStalled(true), 20_000)
    return () => clearTimeout(timer)
  }, [inFlightUploadStep])

  // Once 'done', finish — gated against a stale prior-cycle 'done' and an unconfirmed
  // priorDraftCleanupConfirmed (must be acknowledged via its own "Continue anyway" banner first).
  useEffect(() => {
    if (logoState.step !== 'done' || !createdTenantId) return
    if (startedForTenantIdRef.current !== createdTenantId) return
    if (!hasLeftDoneSinceStartRef.current) return
    if (logoState.priorDraftCleanupConfirmed === false) return
    onDone(createdTenantId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logoState.step, createdTenantId])

  // For top-level (post-link-stage) states' "Continue without logo" — a plain close, no discard.
  const finishWithoutLogo = () => {
    if (!createdTenantId) return
    onDone(createdTenantId)
  }

  // Sole caller of abandonPendingUpload(): confirmed/not-needed finishes immediately; an
  // unconfirmed result holds the dialog open for an explicit acknowledgement instead.
  const continueWithoutLogo = async () => {
    const result = await abandonPendingUpload()
    if (result === 'confirmed' || result === 'not-needed') {
      finishWithoutLogo()
      return
    }
    setAwaitingAbandonAck(true)
  }

  const startForTenant = (tenantId: string) => {
    setCreatedTenantId(tenantId)
  }

  const reset = () => {
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl)
    setPickedLogoFile(null)
    setLogoPreviewUrl(null)
    setLogoValidationError(null)
    setCreatedTenantId(null)
    startedForTenantIdRef.current = null
    hasLeftDoneSinceStartRef.current = true
    setAwaitingAbandonAck(false)
    setHasRetriedThisAttempt(false)
    setStartOverDialogOpen(false)
  }

  return {
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
    startForTenant,
    reset,
  }
}

export type CreateTenantLogoFlowApi = ReturnType<typeof useCreateTenantLogoFlow>
