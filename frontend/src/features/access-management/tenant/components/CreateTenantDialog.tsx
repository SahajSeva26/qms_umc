import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { FiArrowLeft, FiPlus } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useCreateTenant } from '@/features/access-management/tenant/hooks/useCreateTenant'
import { useTenantSalesRepPicker } from '@/features/access-management/tenant/hooks/useTenantSalesRepPicker'
import { useCreateTenantLogoFlow } from '@/features/access-management/tenant/hooks/useCreateTenantLogoFlow'
import { CREATE_TENANT_STEP_FIELD_NAMES, EMPTY_FORM_VALUES, useTenantFormResolver, type TenantFormValues } from '@/features/access-management/tenant/tenant.wizard'
import type { LocationResolutionState } from '@/components/widgets/location-picker/location.types'
import { TENANT_ROUTES } from '@/features/access-management/tenant/tenant.routes'
import { TenantWizardValidationProvider } from '@/features/access-management/tenant/components/wizard/TenantWizardValidationContext'
import TenantBasicsStep from '@/features/access-management/tenant/components/wizard/TenantBasicsStep'
import TenantLocationStep from '@/features/access-management/tenant/components/wizard/TenantLocationStep'
import TenantOwnerStep from '@/features/access-management/tenant/components/wizard/TenantOwnerStep'
import CreateTenantLogoFlow from '@/features/access-management/tenant/components/wizard/CreateTenantLogoFlow'

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

  const salesRepPicker = useTenantSalesRepPicker(open)

  const logoFlow = useCreateTenantLogoFlow({
    onDone: (tenantId) => {
      resetAndClose()
      navigate(TENANT_ROUTES.TENANT_DETAIL.replace(':id', tenantId))
    },
  })
  const isPostCreateFlowActive = logoFlow.isPostCreateFlowActive

  const methods = useForm<TenantFormValues>({
    resolver,
    mode: 'onChange',
    defaultValues: EMPTY_FORM_VALUES,
  })
  const { handleSubmit, reset, trigger } = methods

  const resetAndClose = () => {
    reset(EMPTY_FORM_VALUES)
    setStep(0)
    setAdvanceAttempted(false)
    salesRepPicker.setPickerOpened(false)
    setLocationResolution('idle')
    setLocationResolutionError(null)
    createTenant.reset()
    logoFlow.reset()
    setOpen(false)
  }

  // Step 0 -> 1: validate only the company-basics fields that render on step 0.
  const handleNextFromBasics = async () => {
    setAdvanceAttempted(true)
    const valid = await trigger(CREATE_TENANT_STEP_FIELD_NAMES[0])
    if (valid) setStep(1)
  }

  // Step 1 -> 2: validate address here, where its error UI now renders — step 2 (owner account)
  // has no address UI, so an incomplete address would otherwise silently block submit.
  const handleNextFromLocation = async () => {
    setAdvanceAttempted(true)
    const valid = await trigger(CREATE_TENANT_STEP_FIELD_NAMES[1])
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
        if (!logoFlow.pickedLogoFile) {
          resetAndClose()
          navigate(TENANT_ROUTES.TENANT_DETAIL.replace(':id', res.data.id))
          return
        }
        // Logo picked — don't close/navigate yet; the guarded effect inside useCreateTenantLogoFlow
        // starts the upload once it re-renders with this id, and finish happens once that flow ends.
        logoFlow.startForTenant(res.data.id)
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

        <FormProvider {...methods}>
          <TenantWizardValidationProvider value={{ advanceAttempted }}>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {!isPostCreateFlowActive && step === 0 && (
                  <TenantBasicsStep salesRepPicker={salesRepPicker} logoFlow={logoFlow} />
                )}

                {!isPostCreateFlowActive && step === 1 && (
                  <TenantLocationStep
                    setLocationResolution={setLocationResolution}
                    locationHint={locationHint}
                    setLocationHint={setLocationHint}
                  />
                )}

                {!isPostCreateFlowActive && step === 2 && <TenantOwnerStep />}

                {isPostCreateFlowActive && <CreateTenantLogoFlow flow={logoFlow} variant="status" />}

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
          </TenantWizardValidationProvider>
        </FormProvider>
      </DialogContent>
    </Dialog>
  )
}

export default CreateTenantDialog
