import type { ReactNode } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import { PROJECT_THERAPY_LABEL, type ProjectTherapy } from '@/types/project.types'
import { CAMP_TYPE_LABEL, CAMP_TYPE_VALUES } from '@/types/campReal.types'
import { TEST_STATUS_LABEL } from '@/features/test-master/testMaster.types'
import type { TestFormValues } from '@/features/test-master/schemas/test.schemas'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import FieldLabel from '@/components/ui/FieldLabel'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

const THERAPY_OPTIONS = Object.keys(PROJECT_THERAPY_LABEL) as ProjectTherapy[]
const STATUS_OPTIONS = ['active', 'inactive'] as const

const Field = ({ label, htmlFor, error, children }: { label: string; htmlFor: string; error?: string; children: ReactNode }) => (
  <div>
    <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
    {children}
    {error && <p className="text-[11px] mt-1 text-danger">{error}</p>}
  </div>
)

interface TestMetadataFieldsProps {
  isEdit: boolean
}

const TestMetadataFields = ({ isEdit }: TestMetadataFieldsProps) => {
  const { register, control, formState: { errors, touchedFields, isSubmitted } } = useFormContext<TestFormValues>()

  const fieldError = (field: keyof TestFormValues) => (touchedFields[field] || isSubmitted ? errors[field]?.message : undefined)

  return (
    <>
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
    </>
  )
}

export default TestMetadataFields
