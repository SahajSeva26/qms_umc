import { useState, type ReactNode } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { TestEntity } from '@/features/test-master/testMaster.types'
import { TEST_STATUS_LABEL } from '@/features/test-master/testMaster.types'
import { PROJECT_THERAPY_LABEL, type ProjectTherapy } from '@/types/project.types'
import { CAMP_TYPE_LABEL, CAMP_TYPE_VALUES, type CampType } from '@/types/campReal.types'
import { useCreateTest } from '@/features/test-master/hooks/useCreateTest'
import { useUpdateTest } from '@/features/test-master/hooks/useUpdateTest'
import { buildTestFormSchema, type TestFormValues } from '@/features/test-master/schemas/test.schemas'
import InventoryMasterMultiPicker from '@/features/inventory/real/components/InventoryMasterMultiPicker'
import TestConfigInputsEditor from '@/features/test-master/components/TestConfigInputsEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import FieldLabel from '@/components/ui/FieldLabel'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import MutationStatusBanner from '@/components/ui/MutationStatusBanner'

const THERAPY_OPTIONS = Object.keys(PROJECT_THERAPY_LABEL) as ProjectTherapy[]
const STATUS_OPTIONS = ['active', 'inactive'] as const

const Field = ({ label, htmlFor, error, children }: { label: string; htmlFor: string; error?: string; children: ReactNode }) => (
  <div>
    <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
    {children}
    {error && <p className="text-[11px] mt-1 text-danger">{error}</p>}
  </div>
)

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

// The resource sections are genuinely different UIs by mode, not the same
// component with a disabled flag: creating a test lets you pick real
// devices/consumables by name (InventoryMasterMultiPicker, live search, no
// display gap since nothing has round-tripped through the backend yet).
// Editing an existing test shows a read-only count instead — the backend's
// mapper never returns resource-line item names even when populated, so
// showing raw ids as if they were labels, or fetching each one individually
// to fake names, are both ruled out. Editing an existing test's resource
// list is out of scope until that backend gap is fixed.
const TestForm = ({ test, onClose, hasRecordedResults = false }: TestFormProps) => {
  const isEdit = !!test
  const createMutation = useCreateTest()
  const updateMutation = useUpdateTest(test?.id ?? '')
  const mutation = isEdit ? updateMutation : createMutation

  // Display-only labels for the create-mode pickers — never submitted.
  // Empty in create mode by construction (nothing is pre-selected yet).
  const [deviceLabels, setDeviceLabels] = useState<Record<string, string>>({})
  const [consumableLabels, setConsumableLabels] = useState<Record<string, string>>({})

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
  const { register, handleSubmit, control, formState: { errors, touchedFields, isSubmitted } } = form

  const fieldError = (field: keyof TestFormValues) => (touchedFields[field] || isSubmitted ? errors[field]?.message : undefined)

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

      <Field label="Name *" htmlFor="test-form-name" error={fieldError('name')}>
        <Input id="test-form-name" type="text" className="text-[13px]" {...register('name')} />
      </Field>

      <Field label="Description" htmlFor="test-form-description" error={fieldError('description')}>
        <Textarea id="test-form-description" rows={2} className="text-[13px] max-h-40 overflow-y-auto" {...register('description')} />
      </Field>

      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Therapy *" htmlFor="test-form-therapy" error={fieldError('therapy')}>
          <Controller
            control={control}
            name="therapy"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={isEdit}>
                <SelectTrigger id="test-form-therapy" className="w-full text-[13px]">
                  <SelectValue>{() => (field.value ? PROJECT_THERAPY_LABEL[field.value] : 'Select therapy')}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {THERAPY_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{PROJECT_THERAPY_LABEL[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {isEdit && (
            <p className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
              Therapy can't be changed after creation — existing Projects may already reference this test.
            </p>
          )}
        </Field>
        <Field label="Camp type *" htmlFor="test-form-camp-type" error={fieldError('campType')}>
          <Controller
            control={control}
            name="campType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={isEdit}>
                <SelectTrigger id="test-form-camp-type" className="w-full text-[13px]">
                  <SelectValue>{() => (field.value ? CAMP_TYPE_LABEL[field.value] : 'Select camp type')}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CAMP_TYPE_VALUES.map((t) => (
                    <SelectItem key={t} value={t}>{CAMP_TYPE_LABEL[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {isEdit && (
            <p className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
              Camp type can't be changed after creation.
            </p>
          )}
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Duration (minutes) *" htmlFor="test-form-duration" error={fieldError('duration')}>
          <Input
            id="test-form-duration"
            type="number"
            min={0}
            step="any"
            className="text-[13px]"
            {...register('duration', { valueAsNumber: true })}
          />
        </Field>
        <Field label="Price *" htmlFor="test-form-price" error={fieldError('price')}>
          <Input
            id="test-form-price"
            type="number"
            min={0}
            step="any"
            className="text-[13px]"
            {...register('price', { valueAsNumber: true })}
          />
        </Field>
      </div>

      <Field label="Status" htmlFor="test-form-status">
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="test-form-status" className="w-full text-[13px]">
                <SelectValue>{() => TEST_STATUS_LABEL[field.value]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{TEST_STATUS_LABEL[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <TestConfigInputsEditor hasRecordedResults={hasRecordedResults} />

      {isEdit ? (
        <div className="rounded-xl border p-3 space-y-1 text-[12px]" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
          <div>{test.consumption.length} resource{test.consumption.length === 1 ? '' : 's'}</div>
          <p className="mt-1">Devices/consumables can be set when a test is created; editing an existing test's resource list isn't supported yet.</p>
        </div>
      ) : (
        <>
          <div>
            <FieldLabel>Devices required</FieldLabel>
            <Controller
              control={control}
              name="requiredDeviceIds"
              render={({ field }) => (
                <InventoryMasterMultiPicker
                  value={field.value}
                  labels={deviceLabels}
                  onChange={(ids, labels) => { field.onChange(ids); setDeviceLabels(labels) }}
                  type="device"
                />
              )}
            />
          </div>
          <div>
            <FieldLabel>Consumables required</FieldLabel>
            <Controller
              control={control}
              name="consumableIds"
              render={({ field }) => (
                <InventoryMasterMultiPicker
                  value={field.value}
                  labels={consumableLabels}
                  onChange={(ids, labels) => { field.onChange(ids); setConsumableLabels(labels) }}
                  type="consumable"
                />
              )}
            />
          </div>
        </>
      )}

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
