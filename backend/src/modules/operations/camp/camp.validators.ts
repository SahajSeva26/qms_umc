// Camp Validators
import { z } from 'zod';
import { BILLING_TYPES, CAMP_STATUSES, CAMP_TYPES } from './camp.constants';
import { isValidObjectID } from '../../../shared/utils/strings';

const objectId = (label: string) =>
    z.string().refine((val) => isValidObjectID(val), { message: `${label} must be a valid id` });

const TimeSlotSchema = z.object({
    start: z.string().min(1).openapi({ example: '09:00' }),
    end: z.string().min(1).openapi({ example: '13:00' }),
});

// coordinates are stored GeoJSON-style: [longitude, latitude] (lng first) — matches geoProfile.
const CoordinatesSchema = z
    .tuple([
        z.number().min(-180).max(180), // longitude
        z.number().min(-90).max(90), // latitude
    ])
    .openapi({ example: [79.513, 29.2183] });

//1: create ====================================>
// tenant (client) + division are always required — a camp always belongs to a client. `project`
// is optional: a camp may be booked standalone (no won-deal project behind it). tenant is
// validated against the division (and the project, when linked) in the service.
export const CreateCampPayloadSchema = z.object({
    tenant: objectId('Tenant').openapi({ example: '665f0c3a1a2b3c4d5e6f7a88' }),
    division: objectId('Division').openapi({ example: '665f0c3a1a2b3c4d5e6f7a89' }),
    project: objectId('Project').optional().openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
    doctor: objectId('Doctor').openapi({ example: '665f0c3a1a2b3c4d5e6f7a8b' }),

    // classification
    type: z.enum(Object.values(CAMP_TYPES)).optional().openapi({ example: 'screening' }),
    billingType: z.enum(Object.values(BILLING_TYPES)).optional().openapi({ example: 'billable' }),
    patientExpectation: z.number().int().nonnegative().optional().openapi({ example: 50 }),

    // field-force assignment — `fo` is optional: when omitted, the nearest available FO is
    // auto-assigned in create() from `coordinates`. Supply it to override the auto-pick. The
    // pharma chain stays optional.
    fo: objectId('FO').optional().openapi({ example: '665f0c3a1a2b3c4d5e6f7a8c' }),
    mr: objectId('MR').optional(),
    asm: objectId('ASM').optional(),
    rsm: objectId('RSM').optional(),

    // slot & location — coordinates [lng, lat] are the point the FO allocation searches around
    date: z.coerce.date().openapi({ example: '2026-08-15' }),
    timeSlot: TimeSlotSchema,
    city: z.string().min(1).openapi({ example: 'Mumbai' }),
    state: z.string().min(1).openapi({ example: 'Maharashtra' }),
    coordinates: CoordinatesSchema,

    // devices & confirmation
    devices: z.array(z.string()).optional().openapi({ example: ['bp-monitor', 'glucometer'] }),
    notes: z.string().optional().openapi({ example: 'Society clubhouse, ground floor' }),
    conscentPath: z.string().optional().openapi({ example: 'https://cdn/consent-123.pdf' }),
});
export type ICreateCampPayload = z.infer<typeof CreateCampPayloadSchema>;

//2: update ====================================>
// project/tenant/division/status are NOT editable here — status moves through moveStage()
export const UpdateCampPayloadSchema = z.object({
    doctor: objectId('Doctor').optional(),
    type: z.enum(Object.values(CAMP_TYPES)).optional(),
    billingType: z.enum(Object.values(BILLING_TYPES)).optional(),
    patientExpectation: z.number().int().nonnegative().optional(),
    fo: objectId('FO').optional(),
    mr: objectId('MR').optional(),
    asm: objectId('ASM').optional(),
    rsm: objectId('RSM').optional(),
    date: z.coerce.date().optional(),
    timeSlot: TimeSlotSchema.optional(),
    city: z.string().min(1).optional(),
    state: z.string().min(1).optional(),
    coordinates: CoordinatesSchema.optional(),
    devices: z.array(z.string()).optional(),
    notes: z.string().optional(),
    conscentPath: z.string().optional(),
});
export type IUpdateCampPayload = z.infer<typeof UpdateCampPayloadSchema>;

//3: move stage ====================================>
export const MoveStagePayloadSchema = z.object({
    to: z.enum(Object.values(CAMP_STATUSES)).openapi({ example: 'confirmed' }),
    reason: z.string().min(1).openapi({ example: 'Doctor and venue confirmed for the date' }),
});
export type IMoveStagePayload = z.infer<typeof MoveStagePayloadSchema>;

//4: search ====================================>
export const SearchCampQuerySchema = z.object({
    project: objectId('Project').optional(),
    division: objectId('Division').optional(),
    doctor: objectId('Doctor').optional(),
    fo: objectId('FO').optional(),
    status: z.enum(Object.values(CAMP_STATUSES)).optional().openapi({ example: 'confirmed' }),
    type: z.enum(Object.values(CAMP_TYPES)).optional().openapi({ example: 'screening' }),
    billingType: z.enum(Object.values(BILLING_TYPES)).optional().openapi({ example: 'billable' }),
    city: z.string().optional().openapi({ example: 'Mumbai' }),
    state: z.string().optional().openapi({ example: 'Maharashtra' }),
    // date range — either bound is optional, so you can filter from a date, up to a date, or between
    dateFrom: z.coerce.date().optional().openapi({ example: '2026-08-01' }),
    dateTo: z.coerce.date().optional().openapi({ example: '2026-08-31' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchCampQuery = z.infer<typeof SearchCampQuerySchema>;
