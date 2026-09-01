import { z } from 'zod'
import { PROJECT_THERAPY_LABEL, type ProjectTherapy } from '@/types/project.types'
import { CAMP_TYPE_VALUES } from '@/types/campReal.types'

const THERAPY_VALUES = Object.keys(PROJECT_THERAPY_LABEL) as [ProjectTherapy, ...ProjectTherapy[]]

const configInputOptionSchema = z.object({
  label: z.string().trim().min(1, 'Option label is required'),
  value: z.string().trim().min(1, 'Option value is required'),
})

// Options are required (and non-empty) only for a 'select' input — every
// other type ignores them entirely, matching the backend model exactly.
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
  // code is intentionally absent — server-generated (tst-000001 format), no
  // form field backs it in either create or edit mode. See TestForm.
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().trim().optional(),
  therapy: z.enum(THERAPY_VALUES, { error: 'Therapy is required' }),
  // Not a plain z.enum: 12 pre-existing TestMaster records predate this
  // field and load into the edit form with campType === '' — the field is
  // always disabled (and excluded from the update payload) in edit mode, so
  // requiring a real enum value here would make those legacy records
  // permanently unsaveable in the edit modal even though nothing about them
  // is actually changing. buildTestFormSchema enforces "required" for create
  // mode only, where an empty value is a genuine, correctable omission.
  campType: z.union([z.enum(CAMP_TYPE_VALUES), z.literal('')]),
  duration: z.number({ error: 'Duration is required' }).min(0, 'Duration must be 0 or more'),
  price: z.number({ error: 'Price is required' }).min(0, 'Price must be 0 or more'),
  status: z.enum(['active', 'inactive']),
  // Editable in both create and edit mode — unlike Devices/Consumables below,
  // the backend allows changing a TestMaster's config.inputs[] post-creation.
  // Empty array is valid (no result fields authored yet). Capped to 1: the
  // backend's Test.result is a single {key,value,unit} object, not an array,
  // so TestResultForm can only ever record inputs[0] — the editor UI already
  // hides "Add field" past one entry; this is the schema-level backstop.
  config: z.object({ inputs: z.array(configInputSchema).max(1, 'Only one result field is supported per test') }),
  // Create mode only — TestForm renders these as editable pickers only when
  // there's no existing test; in edit mode the resource sections are
  // read-only counts and these fields are excluded from the update payload.
  requiredDeviceIds: z.array(z.string().trim().min(1)),
  consumableIds: z.array(z.string().trim().min(1)),
})

export type TestFormValues = z.infer<typeof testFormSchema>

// Blocks blanking a description that was previously set — the backend can't
// distinguish "field omitted" from "explicitly cleared" (a falsy-check bug
// in testMaster.service.ts's set(), not fixed in this phase), so a `PUT` sending
// an empty description would silently no-op rather than actually clear it.
// Surface an honest validation error instead of a save that looks
// successful but doesn't do what the user asked.
//
// isEdit also gates campType: required only in create mode. In edit mode the
// field is always disabled and never sent in the update payload, so a blank
// value there only ever reflects a pre-existing legacy record, not something
// this submission could fix — see the campType field's own comment above.
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
