// GeoProfile Validators
import { z } from 'zod';
import { GEO_PROFILE_STATUS, GEO_PROFILE_TYPES } from './geoProfile.constants';
import { CAMP_TIME_SLOTS } from '../camp/camp.constants';

// coordinates are always stored GeoJSON-style: [longitude, latitude] (lng first).
const CoordinatesSchema = z
    .tuple([
        z.number().min(-180).max(180), // longitude
        z.number().min(-90).max(90), // latitude
    ])
    .openapi({ example: [79.5130, 29.2183] });

// registered/base address fields — spread flat onto the profile (not nested). All optional;
// the profile's top-level `coordinates` doubles as the address geo point (no separate field).
const AddressFieldsSchema = {
    addressLine1: z.string().min(1).optional().openapi({ example: '12 MG Road' }),
    addressLine2: z.string().optional().openapi({ example: 'Near City Mall' }),
    locality: z.string().optional().openapi({ example: 'Andheri West' }),
    city: z.string().min(1).optional().openapi({ example: 'Mumbai' }),
    state: z.string().min(1).optional().openapi({ example: 'Maharashtra' }),
    country: z.string().min(1).optional().openapi({ example: 'India' }),
    pincode: z.string().min(1).optional().openapi({ example: '400058' }),
    googlePlaceId: z.string().optional().openapi({ example: 'ChIJ...' }),
};

//1: create ====================================>
// role is the 1:1 natural link — required here, and never editable afterwards.
// tenant is NOT accepted: it is derived from the linked role on the server.
export const CreateGeoProfilePayloadSchema = z.object({
    role: z.string().min(1).openapi({ example: '665f1b2c9d1e4a0012345678' }),
    type: z.enum(Object.values(GEO_PROFILE_TYPES)).openapi({ example: 'fo' }),
    coordinates: CoordinatesSchema,
    coverageRadius: z.number().positive().optional().openapi({ example: 30000 }),
    status: z.enum(Object.values(GEO_PROFILE_STATUS)).optional().openapi({ example: 'active' }),
    meta: z.record(z.string(), z.any()).optional().openapi({ example: { vehicle: 'bike' } }),
    ...AddressFieldsSchema,
});
export type ICreateGeoProfilePayload = z.infer<typeof CreateGeoProfilePayloadSchema>;

//2: update ====================================>
// role + tenant are intentionally omitted — the link is immutable after create.
export const UpdateGeoProfilePayloadSchema = z.object({
    type: z.enum(Object.values(GEO_PROFILE_TYPES)).optional(),
    coordinates: CoordinatesSchema.optional(),
    coverageRadius: z.number().positive().optional(),
    status: z.enum(Object.values(GEO_PROFILE_STATUS)).optional(),
    meta: z.record(z.string(), z.any()).optional(),
    ...AddressFieldsSchema,
});
export type IUpdateGeoProfilePayload = z.infer<typeof UpdateGeoProfilePayloadSchema>;

//3: search ====================================>
export const SearchGeoProfileQuerySchema = z.object({
    type: z.enum(Object.values(GEO_PROFILE_TYPES)).optional().openapi({ example: 'fo' }),
    role: z.string().optional().openapi({ example: '665f1b2c9d1e4a0012345678' }),
    status: z.enum(Object.values(GEO_PROFILE_STATUS)).optional().openapi({ example: 'active' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchGeoProfileQuery = z.infer<typeof SearchGeoProfileQuerySchema>;

//4: nearest (allocation) ====================================>
// find field staff of a given type whose OWN coverage radius reaches point [lng, lat],
// nearest first. lng/lat come in as query strings and are coerced to numbers.
// date + timeSlot are an OPTIONAL availability check: when BOTH are supplied, each returned FO is
// annotated with `available` for that date + slot (busy = already on a non-cancelled camp then).
// They must be supplied together — availability is per slot, so a date alone is meaningless.
export const NearestGeoProfileQuerySchema = z
    .object({
        type: z.enum(Object.values(GEO_PROFILE_TYPES)).openapi({ example: 'fo' }),
        lng: z.coerce.number().min(-180).max(180).openapi({ example: 79.5130 }),
        lat: z.coerce.number().min(-90).max(90).openapi({ example: 29.2183 }),
        limit: z.string().optional().openapi({ example: '10' }),
        date: z.coerce.date().optional().openapi({ example: '2026-09-20' }),
        timeSlot: z.enum(Object.values(CAMP_TIME_SLOTS)).optional().openapi({ example: '9am-1pm' }),
    })
    .refine((q) => (q.date === undefined) === (q.timeSlot === undefined), {
        message: 'date and timeSlot must be provided together',
        path: ['timeSlot'],
    });
export type INearestGeoProfileQuery = z.infer<typeof NearestGeoProfileQuerySchema>;
