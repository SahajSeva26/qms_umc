import { z } from 'zod'

// Mirrors the backend's camp.validators.ts LocationSchema exactly (addressLine1 + coordinates are
// both REQUIRED there, not just city/state/pincode) — same pattern as pharma's bookCamp.schemas.ts.
// Validating this client-side catches a manually-typed address with no map pin selected, which
// would otherwise pass this dialog's old city/state/pincode-only check and 400 at the backend.
export const voidCampLocationSchema = z.object({
  addressLine1: z.string().trim().min(1, 'Address is required.'),
  addressLine2: z.string().optional(),
  locality: z.string().optional(),
  city: z.string().trim().min(1, 'City is required.'),
  state: z.string().trim().min(1, 'State is required.'),
  country: z.string().trim().min(1).optional(),
  pincode: z.string().trim().min(1, 'Pincode is required.'),
  googlePlaceId: z.string().optional(),
  coordinates: z.tuple([
    z.number('Pick a location on the map to set its coordinates.').min(-180).max(180),
    z.number('Pick a location on the map to set its coordinates.').min(-90).max(90),
  ], 'Pick a location on the map to set its coordinates.'),
})

export const voidCampFormSchema = z.object({
  type: z.string().min(1, 'Select a camp type.'),
  doctorId: z.string().min(1, 'Select a doctor.'),
  date: z.string().min(1, 'Camp date is required.'),
  timeSlot: z.string().min(1, 'Select a time slot.'),
  location: voidCampLocationSchema,
  mailUrl: z.string().trim().min(1, 'The confirmation mail link is required.'),
})
export type VoidCampFormValues = z.infer<typeof voidCampFormSchema>
