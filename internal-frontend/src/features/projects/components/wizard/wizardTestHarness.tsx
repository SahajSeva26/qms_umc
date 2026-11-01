import type { ReactNode } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createProjectWizardSchema, editProjectWizardSchema } from '@/features/projects/schemas/project.schemas'
import { createDefaultWizardForm, type WizardFormState } from '@/features/projects/wizard.types'
import { WizardValidationProvider } from '@/features/projects/components/wizard/WizardValidationContext'

// Mirrors NewProjectWizard.tsx's provider wiring. Uses RHF's `values` (not
// `defaultValues`) so a rerender with new `formValues` resets the live form.
interface WizardTestHarnessProps {
  children: ReactNode
  formValues?: Partial<WizardFormState>
  attemptedFields?: Set<keyof WizardFormState>
  // Defaults to the create-mode schema (leadId required).
  isEdit?: boolean
}

export const WizardTestHarness = ({ children, formValues, attemptedFields = new Set(), isEdit = false }: WizardTestHarnessProps) => {
  const form = useForm<WizardFormState>({
    resolver: zodResolver(isEdit ? editProjectWizardSchema : createProjectWizardSchema),
    mode: 'onChange',
    shouldUnregister: false,
    values: { ...createDefaultWizardForm(), ...formValues },
  })

  return (
    <FormProvider {...form}>
      <WizardValidationProvider value={{ attemptedFields }}>
        {children}
      </WizardValidationProvider>
    </FormProvider>
  )
}
