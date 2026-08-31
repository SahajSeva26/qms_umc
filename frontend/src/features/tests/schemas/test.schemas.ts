import { z } from 'zod'
import { PROJECT_THERAPY_LABEL, type ProjectTherapy } from '@/types/project.types'

const THERAPY_VALUES = Object.keys(PROJECT_THERAPY_LABEL) as [ProjectTherapy, ...ProjectTherapy[]]

export const testFormSchema = z.object({
  // code is intentionally absent — server-generated (tst-000001 format), no
  // form field backs it in either create or edit mode. See TestForm.
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().trim().optional(),
  therapy: z.enum(THERAPY_VALUES),
  duration: z.number({ error: 'Duration is required' }).min(0, 'Duration must be 0 or more'),
  price: z.number({ error: 'Price is required' }).min(0, 'Price must be 0 or more'),
  status: z.enum(['active', 'inactive']),
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
export const buildTestFormSchema = (previousDescription: string | undefined) =>
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
  })
