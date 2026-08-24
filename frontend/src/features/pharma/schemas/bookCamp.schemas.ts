import { z } from 'zod'
import type { BookCampPayload } from '@/types/campReal.types'

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

// `project` is deliberately NOT part of this schema or the form — it's a
// locked value the caller already chose by navigating into that project's
// camp list (see BookCampForm.tsx), spliced into the real BookCampPayload
// right before the mutation fires, never user-editable. This schema/its
// resolver only ever validates+returns what the form actually collects.
export type BookCampFormPayload = Omit<BookCampPayload, 'project'>

// Validates everything BookCampPayload needs EXCEPT `project` — used as
// useReshapingResolver's `schema`, so its Output type must match
// BookCampFormPayload exactly (BookCampPayload minus project). Mirrors
// BookCampPayloadSchema (camp.validators.ts) field-for-field otherwise,
// including conscentPath's misspelling, copied verbatim, not "fixed."
//
// A function, not a static export: `mr` is required only when the caller
// books on behalf of someone else (HO/RSM/ASM) — an MR booking for
// themselves omits it entirely, and the backend defaults to self in that
// case. The two portals need two different schemas even though the wire
// shape is identical.
export const bookCampPayloadSchema = (mrRequired: boolean) =>
  z.object({
    mr: z.string().optional(),
    doctor: z.string().min(1, 'Doctor is required.'),
    type: z.enum(['screening', 'diet', 'lab']).optional(),
    patientExpectation: z.number().int('Must be a whole number.').nonnegative('Must be 0 or more.').optional(),
    // Plain YYYY-MM-DD string (native <input type="date"> output, same as
    // CreateCampPayload.date/campReal.types.ts:131) — never a JS Date, to
    // avoid a timezone/day-shift conversion the backend doesn't need (it
    // accepts the string directly via z.coerce.date() on its side).
    date: z.string().regex(DATE_ONLY_RE, 'Date must be in YYYY-MM-DD format.'),
    timeSlot: z.object({
      start: z.string().min(1, 'Start time is required.'),
      end: z.string().min(1, 'End time is required.'),
    }),
    city: z.string().trim().min(1, 'City is required.'),
    state: z.string().trim().min(1, 'State is required.'),
    coordinates: z.tuple([
      z.number('Longitude is required.').min(-180).max(180),
      z.number('Latitude is required.').min(-90).max(90),
    ]),
    devices: z.array(z.string()).optional(),
    notes: z.string().optional(),
    conscentPath: z.string().optional(),
  }).refine((val) => !mrRequired || !!val.mr, {
    message: 'MR is required.',
    path: ['mr'],
  })
