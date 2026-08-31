import { useState, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { TestEntity } from '@/types/test.types'
import { TEST_STATUS_LABEL } from '@/types/test.types'
import { PROJECT_THERAPY_LABEL, type ProjectTherapy } from '@/types/project.types'
import { useCreateTest } from '@/features/tests/hooks/useCreateTest'
import { useUpdateTest } from '@/features/tests/hooks/useUpdateTest'
import { buildTestFormSchema, type TestFormValues } from '@/features/tests/schemas/test.schemas'
import InventoryMasterMultiPicker from '@/features/inventory/real/components/InventoryMasterMultiPicker'
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
const TestForm = ({ test, onClose }: TestFormProps) => {
  const isEdit = !!test
  const createMutation = useCreateTest()
  const updateMutation = useUpdateTest(test?.id ?? '')
  const mutation = isEdit ? updateMutation : createMutation

  // Display-only labels for the create-mode pickers — never submitted.
  // Empty in create mode by construction (nothing is pre-selected yet).
  const [deviceLabels, setDeviceLabels] = useState<Record<string, string>>({})
  const [consumableLabels, setConsumableLabels] = useState<Record<string, string>>({})

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, touchedFields, isSubmitted },
  } = useForm<TestFormValues>({
    resolver: zodResolver(buildTestFormSchema(test?.description)),
    mode: 'onChange',
    defaultValues: {
      name: test?.name ?? '',
      description: test?.description ?? '',
      // Blank in create mode — therapy decides which Projects can see this
      // test, so it must be a conscious choice, not a silently-applied
      // first-enum-value default. z.enum on the schema rejects '', so
      // submitting without picking one surfaces a real validation error.
      therapy: test?.therapy ?? ('' as ProjectTherapy),
      // No `?? 0` fallback — 0 is a schema-valid value, so defaulting to it
      // would let a blank field silently save as "0 minutes / ₹0" instead of
      // surfacing a required-field error. Left genuinely undefined in create
      // mode; valueAsNumber then parses an untouched input to NaN, which
      // z.number() correctly rejects.
      duration: test?.duration,
      price: test?.price,
      status: test?.status ?? 'active',
      // Edit mode never renders a picker for these (resource sections are
      // read-only there — see below), so there's nothing real to seed from
      // test.consumption; these two fields are only ever form-relevant in
      // create mode, where test is always null.
      requiredDeviceIds: [],
      consumableIds: [],
    },
  })

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
        },
        { onSuccess: onClose },
      )
      return
    }
    createMutation.mutate(
      {
        name: values.name,
        description: values.description || undefined,
        therapy: values.therapy,
        duration: values.duration,
        price: values.price,
        status: values.status,
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
  )
}

export default TestForm
