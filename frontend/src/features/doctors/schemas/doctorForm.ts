import { z } from 'zod'
import type { DefaultValues, FieldNamesMarkedBoolean } from 'react-hook-form'
import type { CreateDoctorPayload, DoctorLocation, UpdateDoctorPayload } from '@/types/doctor.types'

const doctorLocationSchema = z.object({
  addressLine1: z.string().trim().min(1, 'Address is required.'),
  addressLine2: z.string().optional(),
  locality: z.string().optional(),
  city: z.string().trim().min(1, 'City is required.'),
  state: z.string().trim().min(1, 'State is required.'),
  country: z.string().trim().optional(),
  pincode: z.string().trim().min(1, 'Pincode is required.'),
  googlePlaceId: z.string().optional(),
  coordinates: z.tuple(
    [
      z.number('Pick a location on the map to set its coordinates.').min(-180).max(180),
      z.number('Pick a location on the map to set its coordinates.').min(-90).max(90),
    ],
    'Pick a location on the map to set its coordinates.',
  ),
})

// CREATE — pharmaCode present+required, email required+valid, location required+complete.
export const createDoctorFormSchema = z.object({
  pharmaCode: z.string().trim().min(1, 'Pharma doctor code is required'),
  name: z.string().trim().min(1, 'Doctor name is required'),
  specialization: z.enum(['cp', 'gp']),
  mobile: z.string().trim().min(10, 'Mobile number must be at least 10 characters'),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  location: doctorLocationSchema,
})
export type CreateDoctorFormValues = z.infer<typeof createDoctorFormSchema>

// `location` is left undefined here even though CreateDoctorFormValues['location'] is
// non-nullable at the type level — RHF's DefaultValues<T> is a DeepPartial<T>, so every field
// (including a required one) is legitimately optional at the defaultValues stage; validation
// only happens on submit. Leaving it undefined (not a stub object with empty-string fields)
// matters for the shared LocationPicker mock used across this codebase's tests: those mocks
// spread `...(value ?? {})` AFTER their own literal test defaults, so a truthy-but-blank stub
// object would silently overwrite the mock's intended test coordinates with empty strings —
// undefined short-circuits to `{}`, exactly as intended. Consumers (DoctorSingleForm's
// Controller render prop) pass `field.value ?? null` to the LocationPicker/LocationAddressFields
// widgets, which both accept `LocationValue | null`.
export const emptyCreateDoctorFormValues: DefaultValues<CreateDoctorFormValues> = {
  pharmaCode: '',
  name: '',
  specialization: 'cp',
  mobile: '',
  email: '',
  location: undefined,
}

// EDIT — no pharmaCode field at all (immutable; rendered read-only text, never registered).
// email/mobile/location are each validated LOOSELY at the resolver level (must not reject an
// untouched legacy value that predates today's stricter rules) — the real "is this actually
// valid, given it was touched" enforcement for all three happens as dirty-gated submit-time
// checks in EditDoctorSingleForm's submit handler, mirroring exactly how this modal has always
// treated email (blank blocked only if changed) and extending the same treatment to mobile
// (never enforced before; must not become newly strict for untouched legacy records) and
// location (clearing an existing one must block, not silently no-op).
export const editDoctorFormSchema = z.object({
  name: z.string().trim().min(1, 'Doctor name is required'),
  specialization: z.enum(['cp', 'gp']),
  // No min(10) here — an untouched legacy mobile under 10 chars must not block an unrelated edit.
  mobile: z.string(),
  status: z.enum(['active', 'inactive']),
  // Bare z.string(), no format check — an untouched legacy row can have a blank OR a
  // non-empty-but-malformed email (predating validation ever being enforced), and either must
  // round-trip through the resolver without failing when an unrelated field is edited.
  email: z.string(),
  location: doctorLocationSchema.nullable(),
})
export type EditDoctorFormValues = z.infer<typeof editDoctorFormSchema>

export function toCreateDoctorPayload(
  values: CreateDoctorFormValues,
  scope: { division: string; tenant?: string },
): CreateDoctorPayload {
  return { ...values, division: scope.division, tenant: scope.tenant }
}

// IMPORTANT: this mapper assumes the caller (EditDoctorSingleForm's submit handler) has ALREADY
// blocked submission if dirtyFields.location is truthy AND values.location === null (an
// actively-cleared location) — that case must never reach this function, since `location: null`
// mapped through here would otherwise serialize to `location: undefined` and silently omit the
// field from the request, leaving the doctor's old location unchanged while the UI reports
// success. By the time this runs, dirtyFields.location truthy implies values.location is a
// complete, non-null DoctorLocation (enforced by RHF's own field validation on a touched
// location Controller, since a touched-but-incomplete object already fails doctorLocationSchema).
export function toUpdateDoctorPayload(
  values: EditDoctorFormValues,
  dirtyFields: Partial<FieldNamesMarkedBoolean<EditDoctorFormValues>>,
): UpdateDoctorPayload {
  return {
    ...(dirtyFields.name ? { name: values.name } : {}),
    ...(dirtyFields.specialization ? { specialization: values.specialization } : {}),
    ...(dirtyFields.mobile ? { mobile: values.mobile } : {}),
    ...(dirtyFields.email ? { email: values.email } : {}),
    ...(dirtyFields.status ? { status: values.status } : {}),
    // Truthy check on the nested object, not `=== true`; non-null by the precondition above.
    ...(dirtyFields.location ? { location: values.location as DoctorLocation } : {}),
  }
}

export function fromDoctorEntity(doctor: {
  name: string
  specialization: 'cp' | 'gp'
  mobile: string
  email: string
  location: DoctorLocation | null
  status?: 'active' | 'inactive'
}): EditDoctorFormValues {
  return {
    name: doctor.name,
    specialization: doctor.specialization,
    mobile: doctor.mobile,
    email: doctor.email,
    location: doctor.location,
    status: doctor.status ?? 'active',
  }
}
