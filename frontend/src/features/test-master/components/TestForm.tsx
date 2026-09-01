import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { TestEntity } from '@/features/test-master/testMaster.types'
import type { ProjectTherapy } from '@/types/project.types'
import type { CampType } from '@/types/campReal.types'
import { useCreateTest } from '@/features/test-master/hooks/useCreateTest'
import { useUpdateTest } from '@/features/test-master/hooks/useUpdateTest'
import { buildTestFormSchema, type TestFormValues } from '@/features/test-master/schemas/test.schemas'
import TestConfigInputsEditor from '@/features/test-master/components/TestConfigInputsEditor'
import TestMetadataFields from '@/features/test-master/components/TestMetadataFields'
import TestResourcePicker from '@/features/test-master/components/TestResourcePicker'
import { Button } from '@/components/ui/button'
import MutationStatusBanner from '@/components/ui/MutationStatusBanner'

interface TestFormProps {
  // null = create mode. Never a testId — the wrapper (EditTestModal) fetches
  // the full record before this component ever mounts.
  test: TestEntity | null
  onClose: () => void
  // Whether any real Test (result) has been recorded against this catalog
  // entry — always false in create mode (nothing could reference it yet).
  // Informs the config.inputs[] editor's edit-mode note; never restricts
  // editing (results are immutable snapshots, editing config is always safe).
  hasRecordedResults?: boolean
}

const TestForm = ({ test, onClose, hasRecordedResults = false }: TestFormProps) => {
  const isEdit = !!test
  const createMutation = useCreateTest()
  const updateMutation = useUpdateTest(test?.id ?? '')
  const mutation = isEdit ? updateMutation : createMutation

  const form = useForm<TestFormValues>({
    resolver: zodResolver(buildTestFormSchema(test?.description, isEdit)),
    mode: 'onChange',
    defaultValues: {
      name: test?.name ?? '',
      description: test?.description ?? '',
      // Blank in create mode — therapy decides which Projects can see this
      // test, so it must be a conscious choice, not a silently-applied
      // first-enum-value default. z.enum on the schema rejects '', so
      // submitting without picking one surfaces a real validation error.
      therapy: test?.therapy ?? ('' as ProjectTherapy),
      // Blank in create mode, same "conscious choice" reasoning as therapy —
      // z.enum on the schema rejects '', surfacing a real validation error.
      campType: test?.campType ?? ('' as CampType),
      // No `?? 0` fallback — 0 is a schema-valid value, so defaulting to it
      // would let a blank field silently save as "0 minutes / ₹0" instead of
      // surfacing a required-field error. Left genuinely undefined in create
      // mode; valueAsNumber then parses an untouched input to NaN, which
      // z.number() correctly rejects.
      duration: test?.duration,
      price: test?.price,
      status: test?.status ?? 'active',
      // Editable in both modes — seeded from the existing test's config in
      // edit mode, empty in create mode (no result fields authored yet).
      config: { inputs: test?.config?.inputs ?? [] },
      // Edit mode never renders a picker for these (resource sections are
      // read-only there — see below), so there's nothing real to seed from
      // test.consumption; these two fields are only ever form-relevant in
      // create mode, where test is always null.
      requiredDeviceIds: [],
      consumableIds: [],
    },
  })
  const { handleSubmit } = form

  const onSubmit = (values: TestFormValues) => {
    if (isEdit) {
      // description is only ever included when non-blank — the backend's
      // falsy check on set() means an explicit '' would be indistinguishable
      // from "unchanged," but omitting the key entirely keeps this update
      // payload from asserting a description that doesn't exist. therapy is
      // never sent at all: existing Projects can already reference this
      // Test's id, and the backend never validates a Project's tests against
      // its own therapy, so changing a Test's therapy post-creation could
      // silently make an already-linked Project's test selection nonsensical
      // (e.g. a Cardiology Project referencing a Test that's now
      // Pulmonology). Treat therapy as immutable, like code, until the
      // backend can validate/migrate affected Project relationships.
      updateMutation.mutate(
        {
          name: values.name,
          ...(values.description ? { description: values.description } : {}),
          duration: values.duration,
          price: values.price,
          status: values.status,
          config: values.config,
        },
        { onSuccess: onClose },
      )
      return
    }
    // The schema's superRefine already rejects a blank campType in create
    // mode (see buildTestFormSchema) — this can't actually fire once
    // handleSubmit has let validation pass, it's here only to narrow
    // campType's type from `CampType | ''` down to `CampType` for the payload.
    if (!values.campType) return
    createMutation.mutate(
      {
        name: values.name,
        description: values.description || undefined,
        therapy: values.therapy,
        campType: values.campType,
        duration: values.duration,
        price: values.price,
        status: values.status,
        config: values.config,
        consumption: [
          // No rate key — the backend's own normalizeConsumption() force-sets
          // rate: 0 for a device when the caller omits it (a device isn't
          // depleted per test run).
          ...values.requiredDeviceIds.map((item) => ({ item })),
          // Always exactly 1 — still no user-facing quantity control.
          ...values.consumableIds.map((item) => ({ item, rate: 1 })),
        ],
      },
      { onSuccess: onClose },
    )
  }

  return (
    <FormProvider {...form}>
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 min-w-0" noValidate>
      {isEdit && (
        <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
          Code: <span className="font-medium" style={{ color: 'var(--qms-text)' }}>{test.code}</span>
        </p>
      )}

      <TestMetadataFields isEdit={isEdit} />

      <TestConfigInputsEditor hasRecordedResults={hasRecordedResults} />

      <TestResourcePicker isEdit={isEdit} resourceCount={test?.consumption.length ?? 0} />

      <MutationStatusBanner mutation={mutation} errorFallback="Could not save this test — try again." showSuccess={false} />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create test'}
        </Button>
      </div>
    </form>
    </FormProvider>
  )
}

export default TestForm
