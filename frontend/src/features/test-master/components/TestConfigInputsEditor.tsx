import { useFieldArray, useFormContext, Controller } from 'react-hook-form'
import { FiPlus, FiX } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import FieldLabel from '@/components/ui/FieldLabel'
import type { TestFormValues } from '@/features/test-master/schemas/test.schemas'
import type { TestMasterConfigInputType } from '@/features/test-master/testMaster.types'

const INPUT_TYPE_LABEL: Record<TestMasterConfigInputType, string> = {
  number: 'Number',
  string: 'Text',
  boolean: 'Yes/No',
  select: 'Select',
}
const INPUT_TYPE_OPTIONS = Object.keys(INPUT_TYPE_LABEL) as TestMasterConfigInputType[]

interface TestConfigInputsEditorProps {
  // Informational only — recorded results snapshot key/value/unit at
  // record-time, so editing config.inputs[] later can't corrupt them.
  hasRecordedResults?: boolean
}

// Capped at 1: the backend's Test.result is a single {key,value,unit}
// object, so TestResultForm can only ever record inputs[0].
const MAX_CONFIG_INPUTS = 1

const TestConfigInputsEditor = ({ hasRecordedResults = false }: TestConfigInputsEditorProps) => {
  const { control, formState: { errors } } = useFormContext<TestFormValues>()
  const { fields, append, remove } = useFieldArray({ control, name: 'config.inputs' })

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <FieldLabel>Input field</FieldLabel>
        {fields.length < MAX_CONFIG_INPUTS && (
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => append({ label: '', type: 'number', unit: '', options: [] })}
          >
            <FiPlus size={12} /> Add field
          </Button>
        )}
      </div>

      {hasRecordedResults && (
        <p className="text-[11px] mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>
          Changing these fields only affects tests recorded after this change — existing results keep their own values.
        </p>
      )}

      {fields.length === 0 && (
        <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
          No result field yet — a field officer will have nothing to fill in when recording this test.
        </p>
      )}

      <div className="space-y-2.5">
        {fields.map((field, index) => (
          <TestConfigInputRow key={field.id} index={index} onRemove={() => remove(index)} />
        ))}
      </div>
      {errors.config?.inputs?.message && (
        <p className="text-[11px] mt-1 text-danger">{errors.config.inputs.message}</p>
      )}
    </div>
  )
}

const TestConfigInputRow = ({ index, onRemove }: { index: number; onRemove: () => void }) => {
  const { control, register, watch, setValue, formState: { errors } } = useFormContext<TestFormValues>()
  const type = watch(`config.inputs.${index}.type`)
  const rowErrors = errors.config?.inputs?.[index]

  return (
    <div className="rounded-lg border p-2.5" style={{ borderColor: 'var(--qms-border)' }}>
      <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-start">
        <div>
          <Input
            type="text"
            placeholder="Field label, e.g. Blood Sugar Level"
            className="text-[13px]"
            {...register(`config.inputs.${index}.label` as const)}
          />
          {rowErrors?.label?.message && <p className="text-[11px] mt-1 text-danger">{rowErrors.label.message}</p>}
        </div>

        <Controller
          control={control}
          name={`config.inputs.${index}.type` as const}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(nextType) => {
                field.onChange(nextType)
                // RHF keeps an unregistered field's value (shouldUnregister
                // defaults false), so clear stale unit/options on type switch.
                if (nextType === 'boolean') {
                  setValue(`config.inputs.${index}.unit` as const, undefined, { shouldDirty: true, shouldValidate: true })
                }
                if (nextType !== 'select') {
                  setValue(`config.inputs.${index}.options` as const, [], { shouldDirty: true, shouldValidate: true })
                }
              }}
            >
              <SelectTrigger className="w-32 text-[13px]">
                <SelectValue>{() => INPUT_TYPE_LABEL[field.value]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {INPUT_TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{INPUT_TYPE_LABEL[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />

        <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove field" onClick={onRemove}>
          <FiX size={14} />
        </Button>
      </div>

      {type !== 'boolean' && (
        <div className="mt-2">
          <Input
            type="text"
            placeholder="Unit, e.g. mg/dL (optional)"
            className="text-[13px]"
            {...register(`config.inputs.${index}.unit` as const)}
          />
        </div>
      )}

      {type === 'select' && (
        <div className="mt-2">
          <TestConfigOptionsEditor index={index} />
        </div>
      )}
    </div>
  )
}

const TestConfigOptionsEditor = ({ index }: { index: number }) => {
  const { control, register, trigger, formState: { errors } } = useFormContext<TestFormValues>()
  const { fields, append, remove } = useFieldArray({ control, name: `config.inputs.${index}.options` as const })
  const optionsError = errors.config?.inputs?.[index]?.options
  // Array-level error (e.g. "add at least one option") lives at .options.root
  // once useFieldArray has mutated the array at least once (e.g. via
  // remove()); before any such mutation, RHF instead reports the identical
  // error directly on .options itself, with no .root wrapper. A specific
  // row's error (e.g. a duplicate value) lives at .options[i].value.
  const optionsRoot = (optionsError as { root?: { message?: string } } | undefined)?.root
  const optionsArrayError = optionsRoot ?? (Array.isArray(optionsError) ? undefined : optionsError)

  const removeOption = async (optionIndex: number) => {
    remove(optionIndex)
    // useFieldArray's remove() is a structural mutation, not a registered
    // field onChange — it doesn't re-run the parent superRefine on its own,
    // so removing the last option would otherwise leave the "add at least
    // one option" check silently stale instead of firing.
    await trigger(`config.inputs.${index}.options` as const)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold" style={{ color: 'var(--qms-text-muted)' }}>Options</span>
        <Button type="button" variant="outline" size="xs" onClick={() => append({ label: '', value: '' })}>
          <FiPlus size={11} /> Add option
        </Button>
      </div>
      {fields.map((field, optionIndex) => {
        const rowValueError = Array.isArray(optionsError) ? optionsError[optionIndex]?.value : undefined
        return (
          <div key={field.id}>
            <div className="flex items-center gap-1.5">
              <Input
                type="text"
                placeholder="Label, e.g. Positive"
                className="text-[12px]"
                {...register(`config.inputs.${index}.options.${optionIndex}.label` as const)}
              />
              <Input
                type="text"
                placeholder="Value, e.g. positive"
                className="text-[12px]"
                {...register(`config.inputs.${index}.options.${optionIndex}.value` as const)}
              />
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove option" onClick={() => removeOption(optionIndex)}>
                <FiX size={12} />
              </Button>
            </div>
            {rowValueError?.message && <p className="text-[11px] mt-1 text-danger">{rowValueError.message}</p>}
          </div>
        )
      })}
      {optionsArrayError?.message && (
        <p className="text-[11px] text-danger">{typeof optionsArrayError.message === 'string' ? optionsArrayError.message : 'Add at least one option'}</p>
      )}
    </div>
  )
}

export default TestConfigInputsEditor
