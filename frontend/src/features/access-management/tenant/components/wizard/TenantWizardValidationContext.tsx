import { createContext, useContext } from 'react'
import { useFormContext, type FieldErrors } from 'react-hook-form'
import type { TenantFormValues } from '@/features/access-management/tenant/tenant.wizard'

// A single flag (not per-field, unlike the Projects wizard's attemptedFields Set) — once true
// it stays true and shows errors for every field across every step.
interface TenantWizardValidationValue {
  advanceAttempted: boolean
}

const TenantWizardValidationContext = createContext<TenantWizardValidationValue | null>(null)

export const TenantWizardValidationProvider = TenantWizardValidationContext.Provider

// trigger() validates fields but doesn't mark them "touched," so a blind Next
// click on a blank required field would otherwise show no error.
export const useTenantWizardFieldError = () => {
  const { formState: { errors, touchedFields, isSubmitted } } = useFormContext<TenantFormValues>()
  const ctx = useContext(TenantWizardValidationContext)
  if (!ctx) throw new Error('useTenantWizardFieldError must be used within the Create Company wizard')
  const { advanceAttempted } = ctx

  return (name: keyof TenantFormValues): string | undefined => {
    const shouldShow = !!touchedFields[name] || isSubmitted || advanceAttempted
    if (!shouldShow) return undefined
    const error = (errors as FieldErrors<TenantFormValues>)[name]
    return typeof error?.message === 'string' ? error.message : undefined
  }
}
