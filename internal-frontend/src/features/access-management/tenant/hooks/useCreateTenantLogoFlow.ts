import { useEffect, useRef, useState } from 'react'
import { useTenantLogoUpload } from '@/features/access-management/tenant/hooks/useTenantLogoUpload'
import { validateLogoFile } from '@/features/access-management/tenant/tenant.constants'

export interface UseCreateTenantLogoFlowOptions {
  // Called once the logo flow (or an explicit "continue without logo") is genuinely finished — the
  // coordinator's version resets the whole dialog and navigates to the new tenant.
  onDone: (tenantId: string) => void
}

// Owns the post-create logo-upload state: pick -> upload -> activate -> close guard. No deactivate-
// old/link/restore steps — a just-created tenant has no prior logo and the endpoints own replace server-side.
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
  const isPostCreateFlowActive = createdTenantId !== null
  // Keyed by tenant id, not a bare boolean — this dialog never unmounts between opens (Dialog is
  // controlled via `open`), so a bare flag would only ever fire once per page session.
  const startedForTenantIdRef = useRef<string | null>(null)

  const { state: logoState, upload: uploadLogo, retry: retryLogo, reset: resetLogoUpload } = useTenantLogoUpload(createdTenantId ?? '')

  const startLogoUpload = (file: File) => {
    uploadLogo(file)
  }

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
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl)
    setLogoPreviewUrl(URL.createObjectURL(picked))
    setPickedLogoFile(picked)
    // If the tenant already exists ("Choose another logo" after a failure), start immediately.
    if (createdTenantId) startLogoUpload(picked)
  }

  // Fires once BOTH the real tenant id and picked file are known — never called synchronously
  // from onSubmit's onSuccess, since upload() would still close over the stale, empty id.
  useEffect(() => {
    if (!createdTenantId || !pickedLogoFile) return
    if (startedForTenantIdRef.current === createdTenantId) return
    startedForTenantIdRef.current = createdTenantId
    startLogoUpload(pickedLogoFile)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdTenantId, pickedLogoFile])

  // Once 'done', finish — gated against a stale prior-cycle 'done' still showing for one render.
  useEffect(() => {
    if (logoState.step !== 'done' || !createdTenantId) return
    if (startedForTenantIdRef.current !== createdTenantId) return
    onDone(createdTenantId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logoState.step, createdTenantId])

  // Unretryable terminal failure — the uploaded file can't attach, a fresh pick is needed.
  const isTerminalFailure = (step: string) => step === 'activate-rejected'
  // Mid-chain failures the user can retry in place.
  const isRetryable = (step: string) =>
    step === 'create-failed' || step === 'create-uncertain' || step === 'upload-failed' || step === 'activate-failed' || step === 'activate-uncertain'

  const finishWithoutLogo = () => {
    if (!createdTenantId) return
    onDone(createdTenantId)
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
    resetLogoUpload()
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
    retryLogo,
    isTerminalFailure,
    isRetryable,
    finishWithoutLogo,
    startForTenant,
    reset,
  }
}

export type CreateTenantLogoFlowApi = ReturnType<typeof useCreateTenantLogoFlow>
