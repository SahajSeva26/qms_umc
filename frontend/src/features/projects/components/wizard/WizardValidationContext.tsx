import { createContext, useContext } from 'react'
import { useFormContext, type FieldErrors } from 'react-hook-form'
import type { WizardFormState } from '@/features/projects/wizard.types'

// trigger() validates fields but doesn't mark them "touched," so a blind
// Next click on a blank required field would otherwise show no error.
interface WizardValidationValue {
  attemptedFields: Set<keyof WizardFormState>
}

const WizardValidationContext = createContext<WizardValidationValue | null>(null)

export const WizardValidationProvider = WizardValidationContext.Provider

export const useWizardValidation = (): WizardValidationValue => {
  const ctx = useContext(WizardValidationContext)
  if (!ctx) throw new Error('useWizardValidation must be used within the New Project wizard')
  return ctx
}

// Shows a field's error once it's touched, its step's Next has been
// attempted, or the whole form has been submitted — never on a pristine step.
export const useWizardFieldError = () => {
  const { formState: { errors, touchedFields, isSubmitted } } = useFormContext<WizardFormState>()
  const { attemptedFields } = useWizardValidation()

  return (name: keyof WizardFormState): string | undefined => {
    const shouldShow = !!touchedFields[name] || attemptedFields.has(name) || isSubmitted
    if (!shouldShow) return undefined
    const error = (errors as FieldErrors<WizardFormState>)[name]
    return typeof error?.message === 'string' ? error.message : undefined
  }
}
