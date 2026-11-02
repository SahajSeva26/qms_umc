// Weekly-plan Validators

import { z } from 'zod';
import { WEEKLY_PLAN_STATUS } from './weekly-plan.constants';
import { isValidObjectID } from '../../../shared/utils/strings';

const objectId = (label: string) =>
    z.string().refine((val) => isValidObjectID(val), { message: `${label} must be a valid id` });

const AgendaSchema = z.object({
    public: z.string().optional().openapi({ example: 'Introduce new screening program' }),
    private: z.string().optional().openapi({ example: 'Gauge budget for Q3' }),
});

// a single planned visit within the week — mirrors the embedded planSchema on the model
const PlanItemSchema = z.object({
    tenant: objectId('Tenant').openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
    division: objectId('Division').openapi({ example: '665f0c3a1a2b3c4d5e6f7a8b' }),
    contactPerson: objectId('Contact person').openapi({ example: '665f0c3a1a2b3c4d5e6f7a8c' }),
    // lead/invoice/parent are contextual — a follow-up links a lead, a collection visit links an invoice
    lead: objectId('Lead').optional().openapi({ example: '665f0c3a1a2b3c4d5e6f7a8d' }),
    invoice: objectId('Invoice').optional().openapi({ example: '665f0c3a1a2b3c4d5e6f7a8e' }),
    parent: objectId('Parent appointment').optional().openapi({ example: '665f0c3a1a2b3c4d5e6f7a8f' }),
    agenda: AgendaSchema.optional(),
    date: z.coerce.date().openapi({ example: '2026-08-03T10:00:00.000Z' }),
});
export type IPlanItem = z.infer<typeof PlanItemSchema>;

// at most 6 plans per week — mirrors the model's array-cap validator
const PlansArraySchema = z.array(PlanItemSchema).max(6, 'A weekly plan can have at most 6 plans');

//1: create ====================================>
// salesPerson is NOT accepted here — it is auto-set to the creator (owner) in the service.
// status is NOT accepted — it defaults to pending and only moves through moveStage().
export const CreateWeeklyPlanPayloadSchema = z
    .object({
        startDate: z.coerce.date().openapi({ example: '2026-08-03' }),
        endDate: z.coerce.date().openapi({ example: '2026-08-09' }),
        plans: PlansArraySchema.optional(),
    })
    .refine((d) => d.endDate >= d.startDate, {
        message: 'endDate must be on or after startDate',
        path: ['endDate'],
    });
export type ICreateWeeklyPlanPayload = z.infer<typeof CreateWeeklyPlanPayloadSchema>;

//2: update ====================================>
// salesPerson/status are NOT editable here — status moves through moveStage(). Passing `plans`
// replaces the whole list (still capped at 6).
export const UpdateWeeklyPlanPayloadSchema = z.object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    plans: PlansArraySchema.optional(),
});
export type IUpdateWeeklyPlanPayload = z.infer<typeof UpdateWeeklyPlanPayloadSchema>;

//3: move stage ====================================>
export const MoveStagePayloadSchema = z.object({
    to: z.enum(Object.values(WEEKLY_PLAN_STATUS)).openapi({ example: 'approved' }),
    reason: z.string().min(1).openapi({ example: 'Plan approved for the week' }),
});
export type IMoveStagePayload = z.infer<typeof MoveStagePayloadSchema>;

//4: search ====================================>
export const SearchWeeklyPlanQuerySchema = z.object({
    status: z.enum(Object.values(WEEKLY_PLAN_STATUS)).optional().openapi({ example: 'pending' }),
    salesPerson: objectId('Sales person').optional(),
    // bound the plan's week by its startDate
    dateFrom: z.coerce.date().optional().openapi({ example: '2026-08-01' }),
    dateTo: z.coerce.date().optional().openapi({ example: '2026-08-31' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchWeeklyPlanQuery = z.infer<typeof SearchWeeklyPlanQuerySchema>;
