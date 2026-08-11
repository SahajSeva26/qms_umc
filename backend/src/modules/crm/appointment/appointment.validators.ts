// Appointment Validators

import { z } from 'zod';
import {
    APPOINTMENT_INVITE_STATUSES,
    APPOINTMENT_MODES,
    APPOINTMENT_STATUSES,
    APPOINTMENT_TYPES,
} from './appointment.constants';
import { isValidObjectID } from '../../../shared/utils/strings';

const objectId = (label: string) =>
    z.string().refine((val) => isValidObjectID(val), { message: `${label} must be a valid id` });

const AgendaSchema = z.object({
    public: z.string().optional().openapi({ example: 'Discuss Q3 screening rollout' }),
    private: z.string().optional().openapi({ example: 'Push for annual contract' }),
});

// submissionDeadline is intentionally NOT accepted here — it is derived from the meeting end time
// (24 working hours) in the service, so it can never be set manually.
const MomSchema = z.object({
    details: z.string().optional().openapi({ example: 'Client agreed to pilot in 3 cities' }),
});

//1: create ====================================>
// salesPerson is NOT accepted here — it is auto-set to the creator (owner) in the service.
export const CreateAppointmentPayloadSchema = z.object({
    tenant: objectId('Tenant').openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
    division: objectId('Division').openapi({ example: '665f0c3a1a2b3c4d5e6f7a8b' }),
    type: z.enum(Object.values(APPOINTMENT_TYPES)).openapi({ example: 'new' }),
    contactPerson: objectId('Contact person').openapi({ example: '665f0c3a1a2b3c4d5e6f7a8c' }),
    // owner supplies plain role ids; the service maps each into an invite (defaulting to pending)
    internalMembers: z.array(objectId('Internal member')).optional(),
    lead: objectId('Lead').optional().openapi({ example: '665f0c3a1a2b3c4d5e6f7a8d' }),
    parent: objectId('Parent appointment').optional().openapi({ example: '665f0c3a1a2b3c4d5e6f7a8e' }),
    mode: z.enum(Object.values(APPOINTMENT_MODES)).optional().openapi({ example: 'online' }),
    destinationLink: z.string().optional().openapi({ example: 'https://meet.google.com/abc-defg-hij' }),
    startTime: z.coerce.date().openapi({ example: '2026-08-01T10:00:00.000Z' }),
    endTime: z.coerce.date().optional().openapi({ example: '2026-08-01T11:00:00.000Z' }),
    agenda: AgendaSchema.optional(),
    mom: MomSchema.optional(),
});
export type ICreateAppointmentPayload = z.infer<typeof CreateAppointmentPayloadSchema>;

//2: update ====================================>
// tenant/division/salesPerson/parent/status are NOT editable here — status moves through moveStage()
export const UpdateAppointmentPayloadSchema = z.object({
    type: z.enum(Object.values(APPOINTMENT_TYPES)).optional(),
    contactPerson: objectId('Contact person').optional(),
    internalMembers: z.array(objectId('Internal member')).optional(),
    lead: objectId('Lead').optional(),
    mode: z.enum(Object.values(APPOINTMENT_MODES)).optional(),
    destinationLink: z.string().optional(),
    startTime: z.coerce.date().optional(),
    endTime: z.coerce.date().optional(),
    agenda: AgendaSchema.optional(),
    mom: MomSchema.optional(),
});
export type IUpdateAppointmentPayload = z.infer<typeof UpdateAppointmentPayloadSchema>;

//3: move stage ====================================>
// reuses the generic canTransition guard defined on the lead module
export const MoveStagePayloadSchema = z.object({
    to: z.enum(Object.values(APPOINTMENT_STATUSES)).openapi({ example: 'done' }),
    reason: z.string().min(1).openapi({ example: 'Meeting completed, MoM captured' }),
    // next step captured together with this transition — stored on the stage-history entry, not as a
    // standalone field, so every move carries its own next step.
    nextSteps: z.string().optional().openapi({ example: 'Send proposal draft by Friday' }),
});
export type IMoveStagePayload = z.infer<typeof MoveStagePayloadSchema>;

//4: rsvp ====================================>
// a member responds for themselves — accepted or declined only (pending is the initial system state)
export const RespondPayloadSchema = z.object({
    status: z
        .enum([APPOINTMENT_INVITE_STATUSES.ACCEPTED, APPOINTMENT_INVITE_STATUSES.DECLINED])
        .openapi({ example: 'accepted' }),
    note: z.string().optional().openapi({ example: 'Will join 10 minutes late' }),
});
export type IRespondPayload = z.infer<typeof RespondPayloadSchema>;

//5: search ====================================>
export const SearchAppointmentQuerySchema = z.object({
    status: z.enum(Object.values(APPOINTMENT_STATUSES)).optional().openapi({ example: 'planned' }),
    type: z.enum(Object.values(APPOINTMENT_TYPES)).optional().openapi({ example: 'follow-up' }),
    mode: z.enum(Object.values(APPOINTMENT_MODES)).optional().openapi({ example: 'online' }),
    division: objectId('Division').optional(),
    lead: objectId('Lead').optional(),
    salesPerson: objectId('Sales person').optional(),
    contactPerson: objectId('Contact person').optional(),
    dateFrom: z.coerce.date().optional().openapi({ example: '2026-08-01' }),
    dateTo: z.coerce.date().optional().openapi({ example: '2026-08-31' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchAppointmentQuery = z.infer<typeof SearchAppointmentQuerySchema>;
