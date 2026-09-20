// Doctor Validators
import { z } from 'zod';
import { DOCTOR_SPECIALIZATION, DOCTOR_STATUS } from './doctor.constants';
import { isValidObjectID } from '../../../shared/utils/strings';

const objectId = (label: string) =>
    z
        .string()
        .refine((val) => isValidObjectID(val), {
            message: `${label} must be a valid id`,
        });

// coordinates are stored GeoJSON-style: [longitude, latitude] (lng first) — matches camp/geoProfile.
const CoordinatesSchema = z
    .tuple([
        z.number().min(-180).max(180), // longitude
        z.number().min(-90).max(90), // latitude
    ])
    .openapi({ example: [72.8777, 19.076] });

// full postal address for the doctor — same embedded shape as camp's `location`.
const LocationSchema = z.object({
    addressLine1: z.string().min(1).openapi({ example: '12 MG Road' }),
    addressLine2: z.string().optional().openapi({ example: 'Near City Mall' }),
    locality: z.string().optional().openapi({ example: 'Andheri West' }),
    city: z.string().min(1).openapi({ example: 'Mumbai' }),
    state: z.string().min(1).openapi({ example: 'Maharashtra' }),
    country: z.string().min(1).optional().openapi({ example: 'India' }),
    pincode: z.string().min(1).openapi({ example: '400058' }),
    googlePlaceId: z.string().optional().openapi({ example: 'ChIJ...' }),
    coordinates: CoordinatesSchema,
});

//1: create ====================================>
// pharmaCode is the natural key — required here, and never editable afterwards.
export const CreateDoctorPayloadSchema = z.object({
    // required only for platform (QMS) staff — which tenant this doctor belongs to.
    // ignored for customer users: the service pins it to their own tenant.
    tenant: objectId('Tenant')
        .optional()
        .openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
    // the division (within the tenant) this doctor belongs to — required, and validated in the
    // service to actually belong to the resolved tenant. Immutable after create (not in update).
    division: objectId('Division').openapi({ example: '665f0c3a1a2b3c4d5e6f7a8b' }),
    pharmaCode: z.string().min(1).openapi({ example: 'DOC-0012' }),
    name: z.string().min(1).openapi({ example: 'Dr. Anil Kumar' }),
    specialization: z
        .enum(Object.values(DOCTOR_SPECIALIZATION))
        .openapi({ example: 'cp' }),
    mobile: z.string().min(10).openapi({ example: '9876543210' }),
    email: z.email().openapi({ example: 'anil.kumar@example.com' }),
    // full postal address + geo point (embedded, same shape as camp's location)
    location: LocationSchema,
    status: z
        .enum(Object.values(DOCTOR_STATUS))
        .optional()
        .openapi({ example: 'active' }),
});
export type ICreateDoctorPayload = z.infer<typeof CreateDoctorPayloadSchema>;

//2: update ====================================>
// pharmaCode is intentionally omitted — it is immutable after create.
export const UpdateDoctorPayloadSchema = z.object({
    name: z.string().min(1).optional(),
    specialization: z.enum(Object.values(DOCTOR_SPECIALIZATION)).optional(),
    mobile: z.string().min(10).optional(),
    email: z.email().optional(),
    // location is replaced wholesale — supply the full object to change any part of it
    location: LocationSchema.optional(),
    status: z.enum(Object.values(DOCTOR_STATUS)).optional(),
});
export type IUpdateDoctorPayload = z.infer<typeof UpdateDoctorPayloadSchema>;

//3: search ====================================>
export const SearchDoctorQuerySchema = z.object({
    // only honoured for platform staff; customer users stay pinned to their own tenant
    tenant: objectId('Tenant')
        .optional()
        .openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
    // filter to a specific division within the tenant (honoured on top of the actor's own-division
    // scope — a customer actor can only ever narrow within their own division, never widen out of it)
    division: objectId('Division')
        .optional()
        .openapi({ example: '665f0c3a1a2b3c4d5e6f7a8b' }),
    name: z.string().optional().openapi({ example: 'Anil' }),
    specialization: z
        .enum(Object.values(DOCTOR_SPECIALIZATION))
        .optional()
        .openapi({ example: 'cp' }),
    status: z
        .enum(Object.values(DOCTOR_STATUS))
        .optional()
        .openapi({ example: 'active' }),
    city: z.string().optional().openapi({ example: 'Haldwani' }),
    state: z.string().optional().openapi({ example: 'Uttarakhand' }),
    pharmaCode: z.string().optional().openapi({ example: 'DOC-0012' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchDoctorQuery = z.infer<typeof SearchDoctorQuerySchema>;

//4: nearest ====================================>
// find doctors within a fixed 35km radius of point [lng, lat], nearest first. lng/lat come in
// as query strings and are coerced to numbers. Respects tenant + division scope like search.
export const NearestDoctorQuerySchema = z.object({
    lng: z.coerce.number().min(-180).max(180).openapi({ example: 72.8777 }),
    lat: z.coerce.number().min(-90).max(90).openapi({ example: 19.076 }),
    specialization: z
        .enum(Object.values(DOCTOR_SPECIALIZATION))
        .optional()
        .openapi({ example: 'cp' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type INearestDoctorQuery = z.infer<typeof NearestDoctorQuerySchema>;

//5: bulk create (CSV upload) ====================================>
// The non-file fields carried in the multipart/form-data body. Per-row doctor fields
// (pharmaCode, name, specialization, mobile, city, state, pincode, email, googleMapLink, status)
// come from the CSV rows and are validated per-row against CreateDoctorPayloadSchema in the service.
export const BulkDoctorPayloadSchema = z.object({
    // required only for platform (QMS) staff — which tenant these doctors belong to.
    // ignored for customer users: the service pins each row to their own tenant.
    tenant: objectId('Tenant')
        .optional()
        .openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
    // the division every doctor in this upload belongs to — one upload targets one division.
    // required (division is mandatory on a doctor) and validated per row against the tenant.
    division: objectId('Division').openapi({ example: '665f0c3a1a2b3c4d5e6f7a8b' }),
});
export type IBulkDoctorPayload = z.infer<typeof BulkDoctorPayloadSchema>;

// Swagger-only shape: adds the binary file field so the docs render a file picker.
export const BulkDoctorOpenApiSchema = BulkDoctorPayloadSchema.extend({
    file: z.any().openapi({
        type: 'string',
        format: 'binary',
    }),
});
