import { z } from 'zod'
import type { DefaultValues, FieldNamesMarkedBoolean } from 'react-hook-form'

// Shared single-doctor create/edit form logic between internal-frontend's full admin form and
// pharma-frontend's lean MR-only form — a validation/location fix lands once, here.
// DoctorSpecialization stays per-app (mirrors a fixed backend enum); callers pass their own values.

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

export function createDoctorFormSchemaFor<S extends string>(specializationValues: [S, ...S[]]) {
  return z.object({
    pharmaCode: z.string().trim().min(1, 'Pharma doctor code is required'),
    name: z.string().trim().min(1, 'Doctor name is required'),
    specialization: z.enum(specializationValues),
    mobile: z.string().trim().min(10, 'Mobile number must be at least 10 characters'),
    email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
    location: doctorLocationSchema,
  })
}

export function editDoctorFormSchemaFor<S extends string>(specializationValues: [S, ...S[]]) {
  // email/mobile/location validate LOOSELY here (an untouched legacy value must round-trip) —
  // real enforcement is a dirty-gated submit-time check in each app's own submit handler.
  return z.object({
    name: z.string().trim().min(1, 'Doctor name is required'),
    specialization: z.enum(specializationValues),
    mobile: z.string(),
    status: z.enum(['active', 'inactive']),
    email: z.string(),
    location: doctorLocationSchema.nullable(),
  })
}

export type CreateDoctorFormValues<S extends string = string> = z.infer<ReturnType<typeof createDoctorFormSchemaFor<S>>>
export type EditDoctorFormValues<S extends string = string> = z.infer<ReturnType<typeof editDoctorFormSchemaFor<S>>>

/** `location` is left undefined (not a blank-string stub) — RHF defaults are a DeepPartial, and a
 * test mock's `...(value ?? {})` spread relies on undefined short-circuiting to `{}`. */
export function emptyCreateDoctorFormValues<S extends string>(defaultSpecialization: S): DefaultValues<CreateDoctorFormValues<S>> {
  return {
    pharmaCode: '',
    name: '',
    specialization: defaultSpecialization,
    mobile: '',
    email: '',
    location: undefined,
  }
}

export interface DoctorLocationLike {
  addressLine1: string
  addressLine2?: string
  locality?: string
  city: string
  state: string
  country?: string
  pincode: string
  googlePlaceId?: string
  coordinates: [number, number]
}

/** `tenant` only applies to a platform caller picking a customer company — omit it entirely for
 * a caller (e.g. an MR) whose session is already pinned to one tenant. */
export interface DoctorCreateScopeValue {
  division: string
  tenant?: string
}

export function toCreateDoctorPayload<S extends string>(
  values: CreateDoctorFormValues<S>,
  scope: DoctorCreateScopeValue,
): CreateDoctorFormValues<S> & { division: string; tenant?: string } {
  return { ...values, division: scope.division, tenant: scope.tenant }
}

/** Assumes the caller already blocked submit on a dirty-but-cleared location — `null` mapped
 * through here serializes to `undefined` and silently drops the field, reporting success with no change. */
export function toUpdateDoctorPayload<S extends string>(
  values: EditDoctorFormValues<S>,
  dirtyFields: Partial<FieldNamesMarkedBoolean<EditDoctorFormValues<S>>>,
) {
  return {
    ...(dirtyFields.name ? { name: values.name } : {}),
    ...(dirtyFields.specialization ? { specialization: values.specialization } : {}),
    ...(dirtyFields.mobile ? { mobile: values.mobile } : {}),
    ...(dirtyFields.email ? { email: values.email } : {}),
    ...(dirtyFields.status ? { status: values.status } : {}),
    // Truthy check on the nested object, not `=== true`; non-null by the precondition above.
    ...(dirtyFields.location ? { location: values.location as DoctorLocationLike } : {}),
  }
}

export function fromDoctorEntity<S extends string>(doctor: {
  name: string
  specialization: S
  mobile: string
  email: string
  location: DoctorLocationLike | null
  status?: 'active' | 'inactive'
}): EditDoctorFormValues<S> {
  return {
    name: doctor.name,
    specialization: doctor.specialization,
    mobile: doctor.mobile,
    email: doctor.email,
    location: doctor.location,
    status: doctor.status ?? 'active',
  } as EditDoctorFormValues<S>
}
