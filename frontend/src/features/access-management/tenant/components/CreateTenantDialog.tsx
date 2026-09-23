import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { FiArrowLeft, FiPlus, FiRefreshCw, FiUpload } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PasswordInput from '@/components/ui/PasswordInput'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useCreateTenant } from '@/features/access-management/tenant/hooks/useCreateTenant'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useRoleTypes } from '@/features/access-management/role-type/hooks/useRoleTypes'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useReplaceTenantLogo } from '@/features/access-management/tenant/hooks/useReplaceTenantLogo'
import { createTenantSchema } from '@/features/access-management/tenant/schemas/tenant.schemas'
import type { CreateTenantPayload } from '@/types/accessManagement.types'
import type { LocationValue } from '@/types/location.types'
import { useReshapingResolver } from '@/hooks/useReshapingResolver'
import { TENANT_ROUTES } from '@/features/access-management/tenant/tenant.routes'
import { PLATFORM_TENANT_CODE, PLATFORM_TENANT_FETCH_LIMIT } from '@/features/access-management/accessManagement.constants'
import LocationPicker from '@/components/widgets/location-picker/LocationPicker'
import LocationAddressFields from '@/components/widgets/location-picker/LocationAddressFields'
import type { LocationResolutionState } from '@/components/widgets/location-picker/location.types'
import FieldErrorText from '@/components/ui/FieldErrorText'
import { ACCEPTED_LOGO_MIME_TYPES, validateLogoFile } from '@/features/access-management/tenant/tenant.constants'

interface TenantFormValues {
  code: string
  name: string
  salesPerson: string
  ownerFirstName: string
  ownerLastName: string
  ownerEmail: string
  ownerPassword: string
  ownerPhone: string
  ownerGender: '' | 'male' | 'female' | 'other'
  address: LocationValue | null
  businessLifetime: string
  gst: string
}

const EMPTY_FORM_VALUES: TenantFormValues = {
  code: '',
  name: '',
  salesPerson: '',
  ownerFirstName: '',
  ownerLastName: '',
  ownerEmail: '',
  ownerPassword: '',
  ownerPhone: '',
  ownerGender: '',
  address: null,
  businessLifetime: '',
  gst: '',
}

const OWNER_FIELD_TO_FORM_FIELD: Record<string, keyof TenantFormValues> = {
  firstName: 'ownerFirstName',
  lastName: 'ownerLastName',
  email: 'ownerEmail',
  password: 'ownerPassword',
  phone: 'ownerPhone',
  gender: 'ownerGender',
}

// Optional end-to-end, unlike Camp where location is required for FO auto-allocation.
const ADDRESS_FIELD_TO_FORM_FIELD: Record<string, keyof TenantFormValues> = {
  addressLine1: 'address', addressLine2: 'address', locality: 'address',
  city: 'address', state: 'address', country: 'address', pincode: 'address',
  googlePlaceId: 'address', coordinates: 'address',
}

const useTenantFormResolver = () =>
  useReshapingResolver<TenantFormValues, CreateTenantPayload>({
    schema: createTenantSchema,
    toPayload: (values) => ({
      code: values.code,
      name: values.name,
      salesPerson: values.salesPerson,
      owner: {
        firstName: values.ownerFirstName,
        lastName: values.ownerLastName || undefined,
        email: values.ownerEmail,
        password: values.ownerPassword,
        phone: values.ownerPhone || undefined,
        gender: values.ownerGender || undefined,
      },
      address: values.address ?? undefined,
      businessLifetime: values.businessLifetime === '' ? undefined : Number(values.businessLifetime),
      gst: values.gst || undefined,
    }),
    nestedFieldMaps: { owner: OWNER_FIELD_TO_FORM_FIELD, address: ADDRESS_FIELD_TO_FORM_FIELD },
  })

// A retry/continue handler here may be async under the hood (useUploadFile's steps deliberately
// re-throw after setting their own failure state) — React's onClick can't await/catch a handler's
// return value, so a rejecting one passed straight to onClick becomes an unhandled promise
// rejection. Mirrors TenantLogoUploader.tsx's own callSafely.
function callSafely(fn: () => void): void {
  void Promise.resolve().then(fn).catch(() => {})
}

const CreateTenantDialog = () => {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  // trigger() doesn't mark fields "touched", so a blind Next click on a
  // blank step wouldn't otherwise show errors for untouched fields.
  const [advanceAttempted, setAdvanceAttempted] = useState(false)
  // `address` (RHF field value) isn't authoritative while this is anything but
  // 'idle' — the pin can visibly move well before (or without ever) firing onChange.
  const [locationResolution, setLocationResolution] = useState<LocationResolutionState>('idle')
  const [locationResolutionError, setLocationResolutionError] = useState<string | null>(null)
  const [locationHint, setLocationHint] = useState<string | null>(null)
  const navigate = useNavigate()
  const createTenant = useCreateTenant()
  const { resolver, parsePayload } = useTenantFormResolver()

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

  const {
    register,
    handleSubmit,
    control,
    reset,
    trigger,
    formState: { errors, touchedFields, isSubmitted },
  } = useForm<TenantFormValues>({
    resolver,
    mode: 'onChange',
    defaultValues: EMPTY_FORM_VALUES,
  })

  // Queries only fire once the dropdown has been opened, not just whenever the dialog is open.
  const [salesRepPickerOpened, setSalesRepPickerOpened] = useState(false)
  const salesRepQueriesEnabled = open && salesRepPickerOpened

  const { data: platformTenantData, isError: platformTenantErrored } = useTenants({ type: 'platform', status: 'active', limit: PLATFORM_TENANT_FETCH_LIMIT }, salesRepQueriesEnabled)
  const platformTenant = platformTenantData?.data?.items.find((t) => t.type === 'platform' || t.code === PLATFORM_TENANT_CODE)

  const { data: salesRepTypeData, isLoading: roleTypeLoading, isError: roleTypeErrored } = useRoleTypes({ code: 'sales-rep', status: 'active' }, salesRepQueriesEnabled)
  const salesRepTypeId = salesRepTypeData?.data?.items[0]?.id

  const { data: salesRepRoleData, isLoading: salesRepsLoading, isError: salesRepsErrored } = useRoles(
    { tenant: platformTenant?.id, type: salesRepTypeId, status: 'active' },
    salesRepQueriesEnabled && !!platformTenant && !!salesRepTypeId,
  )
  const salesReps = salesRepRoleData?.data?.items ?? []
  const salesRepsBusy = roleTypeLoading || salesRepsLoading
  const salesRepsErroredOut = platformTenantErrored || roleTypeErrored || salesRepsErrored

  const fieldError = (field: keyof TenantFormValues) =>
    (touchedFields[field] || isSubmitted || advanceAttempted) ? errors[field]?.message : undefined

  const resetAndClose = () => {
    reset(EMPTY_FORM_VALUES)
    setStep(0)
    setAdvanceAttempted(false)
    setSalesRepPickerOpened(false)
    setLocationResolution('idle')
    setLocationResolutionError(null)
    createTenant.reset()
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl)
    setPickedLogoFile(null)
    setLogoPreviewUrl(null)
    setLogoValidationError(null)
    setCreatedTenantId(null)
    startedForTenantIdRef.current = null
    hasLeftDoneSinceStartRef.current = true
    setAwaitingAbandonAck(false)
    setOpen(false)
  }

  // Once the logo flow reaches 'done', close and navigate. Gated on both refs matching to avoid
  // acting on a stale 'done' carried over from a prior tenant's cycle — see their own comments.
  useEffect(() => {
    if (logoState.step !== 'done' || !createdTenantId) return
    if (startedForTenantIdRef.current !== createdTenantId) return
    if (!hasLeftDoneSinceStartRef.current) return
    const navigateTo = TENANT_ROUTES.TENANT_DETAIL.replace(':id', createdTenantId)
    resetAndClose()
    navigate(navigateTo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logoState.step, createdTenantId])

  // For top-level (post-link-stage) states' "Continue without logo" — a plain close, no discard.
  const resetAndCloseWithoutLogo = () => {
    if (!createdTenantId) return
    const navigateTo = TENANT_ROUTES.TENANT_DETAIL.replace(':id', createdTenantId)
    resetAndClose()
    navigate(navigateTo)
  }

  // Sole caller of abandonPendingUpload(): confirmed/not-needed closes immediately; an unconfirmed
  // result holds the dialog open for an explicit acknowledgement instead.
  const handleContinueWithoutLogo = async () => {
    const result = await abandonPendingUpload()
    if (result === 'confirmed' || result === 'not-needed') {
      resetAndCloseWithoutLogo()
      return
    }
    setAwaitingAbandonAck(true)
  }

  // Step 0 -> 1: validate only the company-basics fields that render on step 0.
  const handleNextFromBasics = async () => {
    setAdvanceAttempted(true)
    const valid = await trigger(['code', 'name', 'salesPerson'])
    if (valid) setStep(1)
  }

  // Step 1 -> 2: validate address here, where its error UI now renders — step 2 (owner account)
  // has no address UI, so an incomplete address would otherwise silently block submit.
  const handleNextFromLocation = async () => {
    setAdvanceAttempted(true)
    const valid = await trigger(['address'])
    if (valid) setStep(2)
  }

  const onSubmit = async (values: TenantFormValues) => {
    if (locationResolution === 'loading') {
      setLocationResolutionError('Still resolving the picked location — wait a moment and try again')
      return
    }
    if (locationResolution === 'error') {
      setLocationResolutionError('Retry or choose "Use this pin" for the location before saving')
      return
    }
    setLocationResolutionError(null)
    const payload = await parsePayload(values)
    createTenant.mutate(payload, {
      onSuccess: (res) => {
        if (!res.data?.id) return
        if (!pickedLogoFile) {
          resetAndClose()
          navigate(TENANT_ROUTES.TENANT_DETAIL.replace(':id', res.data.id))
          return
        }
        // Logo picked — don't close/navigate yet; the guarded effect above starts the upload once
        // it re-renders with this id, and close/navigate happens once that flow finishes.
        setCreatedTenantId(res.data.id)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : (isPostCreateFlowActive ? undefined : resetAndClose()))}>
      <Button
        onClick={() => setOpen(true)}
        className="text-white shrink-0"
        style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
      >
        <FiPlus size={14} /> New Client
      </Button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create company</DialogTitle>
          <DialogDescription>
            {isPostCreateFlowActive
              ? 'The company was created — attaching the logo you selected.'
              : step === 0
                ? 'Step 1 of 3 — company details.'
                : step === 1
                  ? 'Step 2 of 3 — company location.'
                  : 'Step 3 of 3 — registers the company’s initial admin user.'}
          </DialogDescription>
        </DialogHeader>

        {/* onSubmit transitively touches a ref via resetAndClose(), but only inside the real submit
            handler react-hook-form returns, never during this render call. */}
        {/* eslint-disable-next-line react-hooks/refs */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {!isPostCreateFlowActive && step === 0 && (
              <div>
                <h3 className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                  Company details
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs mb-1.5">Logo (optional)</Label>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-14 h-14 rounded-xl border shrink-0 flex items-center justify-center overflow-hidden"
                        style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-strong)' }}
                      >
                        {logoPreviewUrl ? (
                          <img src={logoPreviewUrl} alt="Company logo preview" className="w-full h-full object-contain" />
                        ) : (
                          <FiUpload size={16} style={{ color: 'var(--qms-text-muted)' }} />
                        )}
                      </div>
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
                  <div>
                    <Label htmlFor="tenantCode" className="text-xs mb-1.5">
                      Code *
                    </Label>
                    <Input id="tenantCode" type="text" placeholder="e.g. acme-pharma" {...register('code')} />
                    {fieldError('code') && <p className="text-[11px] mt-1 text-danger">{fieldError('code')}</p>}
                  </div>
                  <div>
                    <Label htmlFor="tenantName" className="text-xs mb-1.5">
                      Name *
                    </Label>
                    <Input id="tenantName" type="text" placeholder="e.g. Acme Pharma" {...register('name')} />
                    {fieldError('name') && <p className="text-[11px] mt-1 text-danger">{fieldError('name')}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="businessLifetime" className="text-xs mb-1.5">
                        Business lifetime (years)
                      </Label>
                      <Input id="businessLifetime" type="number" placeholder="Optional" {...register('businessLifetime')} />
                      {fieldError('businessLifetime') && <p className="text-[11px] mt-1 text-danger">{fieldError('businessLifetime')}</p>}
                    </div>
                    <div>
                      <Label htmlFor="gst" className="text-xs mb-1.5">
                        GST number
                      </Label>
                      <Input id="gst" type="text" placeholder="27AAPFU0939F1ZV" {...register('gst')} />
                      {fieldError('gst') && <p className="text-[11px] mt-1 text-danger">{fieldError('gst')}</p>}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="salesPerson" className="text-xs mb-1.5">
                      Sales rep *
                    </Label>
                    <Controller
                      control={control}
                      name="salesPerson"
                      render={({ field }) => (
                        <Select
                          key={field.value || 'empty'}
                          value={field.value || undefined}
                          onValueChange={field.onChange}
                          onOpenChange={(next) => next && setSalesRepPickerOpened(true)}
                        >
                          <SelectTrigger id="salesPerson" className="w-full">
                            <SelectValue placeholder={salesRepsBusy ? 'Loading...' : 'Select sales rep...'}>
                              {(v: string) => {
                                const r = salesReps.find((role) => role.id === v)
                                return r ? `${r.name} (${r.code})` : salesRepsBusy ? 'Loading...' : 'Select sales rep...'
                              }}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {salesReps.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {fieldError('salesPerson') && <p className="text-[11px] mt-1 text-danger">{fieldError('salesPerson')}</p>}
                    {salesRepPickerOpened && salesRepsErroredOut && (
                      <p className="text-[11px] mt-1 text-danger">Couldn't load sales reps — try again.</p>
                    )}
                    {salesRepPickerOpened && !salesRepsErroredOut && !salesRepsBusy && !platformTenant && (
                      <p className="text-[11px] mt-1 text-danger">No QMS internal (platform) company found — a sales rep must belong to one.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!isPostCreateFlowActive && step === 1 && (
              <div>
                <h3 className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                  Company location
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs mb-1.5">
                      Address (optional)
                    </Label>
                    <Controller
                      control={control}
                      name="address"
                      render={({ field }) => (
                        <div className="space-y-2">
                          <LocationPicker
                            value={field.value}
                            onChange={field.onChange}
                            onResolutionStateChange={setLocationResolution}
                            onLocationHintChange={setLocationHint}
                            defaultCountry="India"
                            countryCode="IN"
                          />
                          <LocationAddressFields value={field.value} onChange={field.onChange} defaultCountry="India" locationHint={locationHint} />
                        </div>
                      )}
                    />
                    {fieldError('address') && <FieldErrorText message={fieldError('address')!} />}
                  </div>
                </div>
              </div>
            )}

            {!isPostCreateFlowActive && step === 2 && (
              <div>
                <h3 className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                  Owner account
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="ownerFirstName" className="text-xs mb-1.5">
                        First name *
                      </Label>
                      <Input id="ownerFirstName" type="text" {...register('ownerFirstName')} />
                      {fieldError('ownerFirstName') && <p className="text-[11px] mt-1 text-danger">{fieldError('ownerFirstName')}</p>}
                    </div>
                    <div>
                      <Label htmlFor="ownerLastName" className="text-xs mb-1.5">
                        Last name
                      </Label>
                      <Input id="ownerLastName" type="text" {...register('ownerLastName')} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="ownerEmail" className="text-xs mb-1.5">
                      Email *
                    </Label>
                    <Input id="ownerEmail" type="email" autoComplete="off" {...register('ownerEmail')} />
                    {fieldError('ownerEmail') && <p className="text-[11px] mt-1 text-danger">{fieldError('ownerEmail')}</p>}
                  </div>
                  <div>
                    <Label htmlFor="ownerPassword" className="text-xs mb-1.5">
                      Password *
                    </Label>
                    <PasswordInput id="ownerPassword" autoComplete="new-password" {...register('ownerPassword')} />
                    {fieldError('ownerPassword') && <p className="text-[11px] mt-1 text-danger">{fieldError('ownerPassword')}</p>}
                  </div>
                  <div>
                    <Label htmlFor="ownerPhone" className="text-xs mb-1.5">
                      Phone
                    </Label>
                    <Input id="ownerPhone" type="text" placeholder="Optional" {...register('ownerPhone')} />
                  </div>
                </div>
              </div>
            )}

            {isPostCreateFlowActive && (
              <div>
                <h3 className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                  Company created
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-14 h-14 rounded-xl border shrink-0 flex items-center justify-center overflow-hidden"
                      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-strong)' }}
                    >
                      {logoPreviewUrl ? (
                        <img src={logoPreviewUrl} alt="Company logo preview" className="w-full h-full object-contain" />
                      ) : (
                        <FiUpload size={16} style={{ color: 'var(--qms-text-muted)' }} />
                      )}
                    </div>
                    <p className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                      {logoState.step === 'uploading' && logoState.upload.step === 'uploading' && 'Uploading logo…'}
                      {logoState.step === 'uploading' && logoState.upload.step === 'activating' && 'Confirming upload…'}
                      {logoState.step === 'uploading' && logoState.upload.step === 'creating' && 'Starting upload…'}
                      {logoState.step === 'deactivating-old' && 'Preparing…'}
                      {logoState.step === 'linking-new' && 'Linking logo…'}
                      {logoState.step === 'link-uncertain-checking' && 'Checking upload status…'}
                      {logoState.step === 'restoring-old' && 'Finishing up…'}
                      {logoState.step === 'cleaning-up-orphan' && 'Cleaning up…'}
                      {isTopLevelRetryable(logoState.step) && "We couldn't confirm the logo upload — you can retry or continue without it."}
                      {isTopLevelTerminalFailure(logoState.step) && "We couldn't attach the logo to the new company."}
                    </p>
                  </div>

                  {/* Nested upload sub-state actions (create/upload/activate) — the only states where
                      abandonPendingUpload() is ever called; see useReplaceTenantLogo.ts. */}
                  {logoState.step === 'uploading' && (
                    <div className="flex flex-wrap items-center gap-2">
                      {(logoState.upload.step === 'create-failed' ||
                        logoState.upload.step === 'create-uncertain' ||
                        logoState.upload.step === 'upload-failed' ||
                        logoState.upload.step === 'activate-failed' ||
                        logoState.upload.step === 'activate-not-uploaded' ||
                        logoState.upload.step === 'activate-uncertain') && (
                        <>
                          <Button type="button" size="xs" variant="outline" onClick={() => callSafely(retryLogoUpload)}>
                            <FiRefreshCw size={11} /> Retry
                          </Button>
                          <Button type="button" size="xs" variant="outline" onClick={() => callSafely(startOverLogoUpload)}>
                            Start over
                          </Button>
                          <Button type="button" size="xs" variant="ghost" onClick={() => void handleContinueWithoutLogo()}>
                            Continue without logo
                          </Button>
                        </>
                      )}
                      {inFlightUploadStep && uploadStalled && (
                        <>
                          <span className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                            Still taking a while?
                          </span>
                          <Button type="button" size="xs" variant="ghost" onClick={() => void handleContinueWithoutLogo()}>
                            Continue without logo
                          </Button>
                        </>
                      )}
                    </div>
                  )}

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
                      <Button type="button" size="xs" variant="ghost" onClick={resetAndCloseWithoutLogo}>
                        Continue without logo
                      </Button>
                    </div>
                  )}

                  {/* Top-level (post-link-stage) terminal failures — Continue here is ALWAYS a plain
                      close+navigate, never a fresh discard attempt; see useReplaceTenantLogo.ts's own
                      recovery logic, already run before any of these states is reached. */}
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
                      <Button type="button" size="xs" variant="ghost" onClick={resetAndCloseWithoutLogo}>
                        Continue without logo
                      </Button>
                    </div>
                  )}

                  {/* Only reachable via the upload-substate "Continue without logo", never the top-level one. */}
                  {awaitingAbandonAck && (
                    <div className="text-[11px] rounded-lg px-2.5 py-1.5 bg-danger-soft border border-danger text-danger">
                      Company created. We couldn't confirm the logo upload was cleaned up.
                      <Button type="button" size="xs" variant="outline" className="ml-2" onClick={resetAndCloseWithoutLogo}>
                        Continue anyway
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {createTenant.isError && (
              <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
                {(createTenant.error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                  'Failed to create company. Please try again.'}
              </div>
            )}

            {locationResolutionError && (
              <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
                {locationResolutionError}
              </div>
            )}
          </div>

          {/* No footer during the post-create logo flow — its own actions live inline above instead. */}
          {!isPostCreateFlowActive && (
            <DialogFooter className="mt-4">
              {step === 0 && (
                <>
                  <Button type="button" variant="outline" onClick={resetAndClose} disabled={createTenant.isPending}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleNextFromBasics}>Next</Button>
                </>
              )}
              {step === 1 && (
                <>
                  <Button type="button" variant="outline" onClick={() => setStep(0)} disabled={createTenant.isPending}>
                    <FiArrowLeft size={14} /> Back
                  </Button>
                  <Button type="button" onClick={handleNextFromLocation} disabled={locationResolution === 'loading'}>
                    {locationResolution === 'loading' ? 'Resolving location…' : 'Next'}
                  </Button>
                </>
              )}
              {step === 2 && (
                <>
                  <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={createTenant.isPending}>
                    <FiArrowLeft size={14} /> Back
                  </Button>
                  <Button type="submit" disabled={createTenant.isPending || locationResolution === 'loading'}>
                    {createTenant.isPending ? 'Creating…' : locationResolution === 'loading' ? 'Resolving location…' : 'Create company'}
                  </Button>
                </>
              )}
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CreateTenantDialog
