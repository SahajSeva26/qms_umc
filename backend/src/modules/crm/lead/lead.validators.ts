import { z } from 'zod';
import { LEAD_PROJECT_TYPES, LEAD_STATUSES } from './lead.constants';
import { isValidObjectID } from '../../../shared/utils/strings';

const objectId = (label: string) =>
    z.string().refine((val) => isValidObjectID(val), { message: `${label} must be a valid id` });

const OfferSchema = z.object({
    code: z.string().openapi({ example: 'screening_camps' }),
    subOffer: z.string().optional().openapi({ example: 'diabetes_screening' }),
    reason: z.string().optional().openapi({ example: 'High footfall expected' }),
});

//1: create ====================================>
export const CreateLeadPayloadSchema = z.object({
    division: objectId('Division').openapi({ example: '665f0c3a1a2b3c4d5e6f7a8b' }),
    contactPerson: objectId('Contact person').openapi({ example: '665f0c3a1a2b3c4d5e6f7a8c' }),
    salesPerson: objectId('Sales person').openapi({ example: '665f0c3a1a2b3c4d5e6f7a8d' }),
    title: z.string().min(1).openapi({ example: 'Cardio screening drive Q3' }),
    problemStatement: z.string().min(1).openapi({ example: 'Low patient identification in tier-2 cities' }),
    numberOfMRS: z.number().int().nonnegative().openapi({ example: 38 }),
    projectType: z.enum(Object.values(LEAD_PROJECT_TYPES)).optional().openapi({ example: 'screening' }),
    focusTherapy: z.array(z.string()).optional().openapi({ example: ['cardiology'] }),
    focusTherapyDoctor: z.array(z.string()).optional().openapi({ example: ['Cardiologist'] }),
    currentlyDoing: z.array(z.string()).optional().openapi({ example: ['mr_in_clinic'] }),
    offers: z.array(OfferSchema).optional(),
    notes: z.string().optional().openapi({ example: 'Referred by regional head' }),
    estimatedValue: z.number().nonnegative().optional().openapi({ example: 500000 }),
    confidence: z.number().int().min(0).max(100).default(35).openapi({ example: 35 }),
    followUpDate: z.coerce.date().optional().openapi({ example: '2026-08-01' }),
});
export type ICreateLeadPayload = z.infer<typeof CreateLeadPayloadSchema>;

//2: update ====================================>
// division/tenant/status are NOT editable here — status moves through moveStage()
export const UpdateLeadPayloadSchema = z.object({
    contactPerson: objectId('Contact person').optional(),
    salesPerson: objectId('Sales person').optional(),
    title: z.string().min(1).optional(),
    problemStatement: z.string().min(1).optional(),
    numberOfMRS: z.number().int().nonnegative().optional(),
    projectType: z.enum(Object.values(LEAD_PROJECT_TYPES)).optional(),
    focusTherapy: z.array(z.string()).optional(),
    focusTherapyDoctor: z.array(z.string()).optional(),
    currentlyDoing: z.array(z.string()).optional(),
    offers: z.array(OfferSchema).optional(),
    notes: z.string().optional(),
    estimatedValue: z.number().nonnegative().optional(),
    confidence: z.number().int().min(0).max(100).optional(),
    followUpDate: z.coerce.date().optional(),
});
export type IUpdateLeadPayload = z.infer<typeof UpdateLeadPayloadSchema>;

//3: move stage ====================================>
export const MoveStagePayloadSchema = z.object({
    to: z.enum(Object.values(LEAD_STATUSES)).openapi({ example: 'qualified' }),
    reason: z.string().min(1).openapi({ example: 'Client confirmed budget and timeline' }),
});
export type IMoveStagePayload = z.infer<typeof MoveStagePayloadSchema>;

//4: search ====================================>
export const SearchLeadQuerySchema = z.object({
    title: z.string().optional().openapi({ example: 'Cardio' }),
    status: z.enum(Object.values(LEAD_STATUSES)).optional().openapi({ example: 'qualified' }),
    projectType: z.enum(Object.values(LEAD_PROJECT_TYPES)).optional().openapi({ example: 'screening' }),
    division: objectId('Division').optional(),
    salesPerson: objectId('Sales person').optional(),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchLeadQuery = z.infer<typeof SearchLeadQuerySchema>;
