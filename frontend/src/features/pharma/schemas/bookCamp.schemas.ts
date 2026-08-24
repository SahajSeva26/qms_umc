import { z } from 'zod'
import type { BookCampPayload } from '@/types/campReal.types'
import { CAMP_TIME_SLOT_VALUES } from '@/types/campTimeSlot.constants'

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

// `project` is deliberately NOT part of this schema or the form — it's a
// locked value spliced into the real payload right before the mutation fires.
export type BookCampFormPayload = Omit<BookCampPayload, 'project'>

// Mirrors BookCampPayloadSchema (camp.validators.ts) field-for-field, including
// conscentPath's misspelling, copied verbatim. mr is required even for self-booking.
export const bookCampPayloadSchema = z.object({
  mr: z.string().min(1, 'MR is required.'),
  doctor: z.string().min(1, 'Doctor is required.'),
  type: z.enum(['screening', 'diet', 'lab']).optional(),
  patientExpectation: z.number().int('Must be a whole number.').nonnegative('Must be 0 or more.').optional(),
  // Plain YYYY-MM-DD string, never a JS Date — avoids a timezone/day-shift
  // conversion the backend doesn't need (it coerces the string itself).
  date: z.string().regex(DATE_ONLY_RE, 'Date must be in YYYY-MM-DD format.'),
  timeSlot: z.enum(CAMP_TIME_SLOT_VALUES, 'Select a time slot.'),
  city: z.string().trim().min(1, 'City is required.'),
  state: z.string().trim().min(1, 'State is required.'),
  coordinates: z.tuple([
    z.number('Longitude is required.').min(-180).max(180),
    z.number('Latitude is required.').min(-90).max(90),
  ]),
  devices: z.array(z.string()).optional(),
  notes: z.string().optional(),
  conscentPath: z.string().optional(),
})
