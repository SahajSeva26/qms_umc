import type { ReactNode } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createProjectWizardSchema, editProjectWizardSchema } from '@/features/projects/schemas/project.schemas'
import { createDefaultWizardForm, type WizardFormState } from '@/features/projects/wizard.types'
import { WizardValidationProvider } from '@/features/projects/components/wizard/WizardValidationContext'

// Test-only harness mirroring NewProjectWizard.tsx's real FormProvider +
// WizardValidationProvider wiring, so an individual WizardStepN component can
// be rendered and driven in isolation exactly like it runs inside the real
// wizard (useFormContext/useWizardValidation both need a real provider tree).
//
// Uses RHF's `values` (not `defaultValues`) so a test can rerender this
// harness with a new `formValues` object and have the live form actually
// reset to it — `defaultValues` is read only once at mount and would
// silently ignore a later rerender, unlike the old prop-drilled `form` prop
// this harness replaces.
interface WizardTestHarnessProps {
  children: ReactNode
  formValues?: Partial<WizardFormState>
  attemptedFields?: Set<keyof WizardFormState>
  // Defaults to the create-mode schema (leadId required) — matches every
  // existing step test, none of which exercise the edit-mode-only path.
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
