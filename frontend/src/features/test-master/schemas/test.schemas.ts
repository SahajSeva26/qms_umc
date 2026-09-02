import { z } from 'zod'
import { PROJECT_THERAPY_LABEL, type ProjectTherapy } from '@/types/project.types'
import { CAMP_TYPE_VALUES } from '@/types/campReal.types'

const THERAPY_VALUES = Object.keys(PROJECT_THERAPY_LABEL) as [ProjectTherapy, ...ProjectTherapy[]]

const configInputOptionSchema = z.object({
  label: z.string().trim().min(1, 'Option label is required'),
  value: z.string().trim().min(1, 'Option value is required'),
})

// Options required only for a 'select' input, matching the backend model.
const configInputSchema = z
  .object({
    label: z.string().trim().min(1, 'Field label is required'),
    type: z.enum(['number', 'string', 'boolean', 'select'], { error: 'Field type is required' }),
    unit: z.string().trim().optional(),
    options: z.array(configInputOptionSchema).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === 'select' && (!value.options || value.options.length === 0)) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Add at least one option for a select field',
      })
    }
  })

export const testFormSchema = z.object({
  // code is intentionally absent — server-generated (tst-000001 format).
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().trim().optional(),
  therapy: z.enum(THERAPY_VALUES, { error: 'Therapy is required' }),
  // Not a plain z.enum: 12 pre-existing records predate this field and load
  // with campType === '' in edit mode. buildTestFormSchema requires a real
  // value only in create mode so those legacy records stay saveable.
  campType: z.union([z.enum(CAMP_TYPE_VALUES), z.literal('')]),
  duration: z.number({ error: 'Duration is required' }).min(0, 'Duration must be 0 or more'),
  price: z.number({ error: 'Price is required' }).min(0, 'Price must be 0 or more'),
  status: z.enum(['active', 'inactive']),
  // Capped to 1: backend's Test.result is a single {key,value,unit} object,
  // not an array, so TestResultForm can only ever record inputs[0].
  config: z.object({ inputs: z.array(configInputSchema).max(1, 'Only one result field is supported per test') }),
  // Create mode only — edit mode's resource sections are read-only counts
  // and these fields are excluded from the update payload.
  requiredDeviceIds: z.array(z.string().trim().min(1)),
  // No .int(): backend (ConsumptionLineSchema.rate) accepts fractional rates
  // (e.g. 1.5 vials), so mirror that floor rather than a looser .positive().
  consumableIds: z.array(z.object({
    id: z.string().trim().min(1),
    quantity: z.number({ error: 'Quantity is required' }).min(1, 'Quantity must be at least 1'),
  })),
})

export type TestFormValues = z.infer<typeof testFormSchema>

// Blocks blanking a previously-set description — backend's set() has a
// falsy-check bug that can't distinguish "omitted" from "explicitly cleared",
// so a blank PUT would silently no-op instead of actually clearing it.
export const buildTestFormSchema = (previousDescription: string | undefined, isEdit: boolean) =>
  testFormSchema.superRefine((values, ctx) => {
    const hadDescription = !!previousDescription?.trim()
    const nowBlank = !values.description?.trim()
    if (hadDescription && nowBlank) {
      ctx.addIssue({
        code: 'custom',
        path: ['description'],
        message: "Clearing a description isn't supported yet — replace it with different text instead.",
      })
    }
    if (!isEdit && !values.campType) {
      ctx.addIssue({
        code: 'custom',
        path: ['campType'],
        message: 'Camp type is required',
      })
    }
  })
