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
  // null = create mode; the wrapper (EditTestModal) fetches the full record
  // before this component ever mounts.
  test: TestEntity | null
  onClose: () => void
  // Informational only, for the config.inputs[] edit-mode note — always
  // false in create mode.
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
      // Blank (not first-enum-value) in create mode — must be a conscious
      // choice; z.enum rejects '' so an unpicked value surfaces a real error.
      therapy: test?.therapy ?? ('' as ProjectTherapy),
      campType: test?.campType ?? ('' as CampType),
      // No `?? 0` fallback — 0 is schema-valid, so defaulting to it would let
      // a blank field silently save as "0 minutes / ₹0" instead of erroring.
      duration: test?.duration,
      price: test?.price,
      status: test?.status ?? 'active',
      config: { inputs: test?.config?.inputs ?? [] },
      // Edit mode's resource section is read-only, so nothing seeds from
      // test.consumption; only relevant in create mode, where test is null.
      requiredDeviceIds: [],
      consumableIds: [],
    },
  })
  const { handleSubmit } = form

  const onSubmit = (values: TestFormValues) => {
    if (isEdit) {
      // description omitted when blank — backend's falsy check on set()
      // can't tell '' from "unchanged". therapy never sent: changing it
      // post-creation could desync already-linked Projects' test selections.
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
    // Unreachable once validation passes (schema already requires campType
    // in create mode) — narrows the type from `CampType | ''` for the payload.
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
          // No rate key — backend's normalizeConsumption() force-sets rate: 0
          // for a device (not depleted per test run) when omitted.
          ...values.requiredDeviceIds.map((item) => ({ item })),
          ...values.consumableIds.map((c) => ({ item: c.id, rate: c.quantity })),
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
