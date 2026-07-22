// Project Validators
import { z } from 'zod';
import {
    CLIENT_REPORT_CANDANCE_TYPES,
    CLIENT_REPORT_POINTERS,
    PAYMENT_TERMS,
    PROJECT_EXECUTION_MODES,
    PROJECT_GO_LIVE_SCOPE,
    PROJECT_STATUS,
    PROJECT_TEST_TYPES,
    PROJECT_THERAPY_TYPES,
    PROJECT_TYPES,
} from './project.constants';
import { ALLOWED_ROLETYPE_CODES } from '../../access-management/role-type/roleType.constants';
import { isValidObjectID } from '../../../shared/utils/strings';

const objectId = (label: string) =>
    z.string().refine((val) => isValidObjectID(val), { message: `${label} must be a valid id` });

// nested: execution mode (PO / agreement / mail confirmation)
const ExecutionModeSchema = z.object({
    mode: z.enum(Object.values(PROJECT_EXECUTION_MODES)).openapi({ example: 'po' }),
    poNumber: z.string().optional().openapi({ example: 'PO-2026-0012' }),
    poDate: z.coerce.date().optional().openapi({ example: '2026-07-01' }),
    poExpiry: z.coerce.date().optional().openapi({ example: '2027-06-30' }),
    agreementNumber: z.string().optional().openapi({ example: 'AGR-88' }),
    agreementStartDate: z.coerce.date().optional().openapi({ example: '2026-07-01' }),
    agreementEndDate: z.coerce.date().optional().openapi({ example: '2027-06-30' }),
    duration: z.number().int().nonnegative().optional().openapi({ example: 12 }),
    agreementDocument: z.string().optional().openapi({ example: 'https://cdn/agr-88.pdf' }),
    emailReference: z.string().optional().openapi({ example: 'RE: Camp confirmation' }),
    emailDocument: z.string().optional().openapi({ example: 'https://cdn/mail.eml' }),
});

const CampTimeSlotSchema = z.object({
    start: z.string().openapi({ example: '09:00' }),
    end: z.string().openapi({ example: '13:00' }),
});

const GoLiveScopeSchema = z.object({
    code: z.enum(Object.values(PROJECT_GO_LIVE_SCOPE)).openapi({ example: 'cities' }),
    values: z.array(z.string()).optional().openapi({ example: ['mumbai', 'pune'] }),
});

const DietChartSchema = z.object({
    name: z.string().min(1).openapi({ example: 'Diabetic diet - week 1' }),
    url: z.string().min(1).openapi({ example: 'https://cdn/diet-w1.pdf' }),
});

//1: create ====================================>
// tenant + division are NOT accepted here — both are derived from the source lead.
export const CreateProjectPayloadSchema = z.object({
    lead: objectId('Lead').openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
    name: z.string().min(1).openapi({ example: 'Cardio screening drive Q3' }),
    therapy: z.enum(Object.values(PROJECT_THERAPY_TYPES)).openapi({ example: 'cardiology' }),
    type: z.array(z.enum(Object.values(PROJECT_TYPES))).min(1).openapi({ example: ['screening_camp'] }),
    tests: z.array(z.enum(Object.values(PROJECT_TEST_TYPES))).optional().openapi({ example: ['bp', 'rbs'] }),

    // execution
    mode: ExecutionModeSchema.optional(),

    // financials
    campCost: z.number().nonnegative().optional().openapi({ example: 15000 }),
    totalCamps: z.number().int().nonnegative().optional().openapi({ example: 40 }),
    gst: z.number().min(0).max(100).optional().openapi({ example: 18 }),
    valueBeforeGST: z.number().nonnegative().optional().openapi({ example: 600000 }),
    additionalCost: z.number().nonnegative().optional().openapi({ example: 25000 }),

    // operations
    campTimeSlots: z.array(CampTimeSlotSchema).optional(),
    freeCancelHours: z.number().int().nonnegative().optional().openapi({ example: 24 }),
    cancellationAllowed: z.number().min(0).max(100).optional().openapi({ example: 10 }),
    campCostDeductionOnChargableCancel: z.number().min(0).max(100).optional().openapi({ example: 50 }),
    goLiveScope: GoLiveScopeSchema.optional(),
    whoCanBookCamp: z
        .array(z.enum(Object.values(ALLOWED_ROLETYPE_CODES.CUSTOMER)))
        .optional()
        .openapi({ example: ['pharma-ms'] }),

    // team (QMS internal staff)
    salesRep: objectId('Sales rep').openapi({ example: '665f0c3a1a2b3c4d5e6f7a8b' }),
    projectCoordinator: objectId('Project coordinator').openapi({ example: '665f0c3a1a2b3c4d5e6f7a8c' }),
    marketingContact: objectId('Marketing contact').openapi({ example: '665f0c3a1a2b3c4d5e6f7a8d' }),
    paymentTerms: z.enum(Object.values(PAYMENT_TERMS)).openapi({ example: 'net_30' }),

    // reports & review
    daysToBookBefore: z.number().int().nonnegative().optional().openapi({ example: 3 }),
    effectiveEarliestSlot: z.coerce.date().optional().openapi({ example: '2026-08-01' }),
    dietChart: z.array(DietChartSchema).optional(),
    poRenewalReminder: z.number().min(0).max(100).optional().openapi({ example: 15 }),
    clientReportCandance: z.enum(Object.values(CLIENT_REPORT_CANDANCE_TYPES)).optional().openapi({ example: 'monthly' }),
    availablePointers: z
        .array(z.enum(Object.values(CLIENT_REPORT_POINTERS)))
        .optional()
        .openapi({ example: ['camp_executed'] }),
    tats: z.string().optional().openapi({ example: 'Reports within 48h of camp' }),
    sops: z.string().optional().openapi({ example: 'https://cdn/sop.pdf' }),
});
export type ICreateProjectPayload = z.infer<typeof CreateProjectPayloadSchema>;

//2: update ====================================>
// lead/tenant/division/status are NOT editable here — status moves through moveStage()
export const UpdateProjectPayloadSchema = z.object({
    name: z.string().min(1).optional(),
    therapy: z.enum(Object.values(PROJECT_THERAPY_TYPES)).optional(),
    type: z.array(z.enum(Object.values(PROJECT_TYPES))).min(1).optional(),
    tests: z.array(z.enum(Object.values(PROJECT_TEST_TYPES))).optional(),
    mode: ExecutionModeSchema.optional(),
    campCost: z.number().nonnegative().optional(),
    totalCamps: z.number().int().nonnegative().optional(),
    gst: z.number().min(0).max(100).optional(),
    valueBeforeGST: z.number().nonnegative().optional(),
    additionalCost: z.number().nonnegative().optional(),
    campTimeSlots: z.array(CampTimeSlotSchema).optional(),
    freeCancelHours: z.number().int().nonnegative().optional(),
    cancellationAllowed: z.number().min(0).max(100).optional(),
    campCostDeductionOnChargableCancel: z.number().min(0).max(100).optional(),
    goLiveScope: GoLiveScopeSchema.optional(),
    whoCanBookCamp: z.array(z.enum(Object.values(ALLOWED_ROLETYPE_CODES.CUSTOMER))).optional(),
    salesRep: objectId('Sales rep').optional(),
    projectCoordinator: objectId('Project coordinator').optional(),
    marketingContact: objectId('Marketing contact').optional(),
    paymentTerms: z.enum(Object.values(PAYMENT_TERMS)).optional(),
    daysToBookBefore: z.number().int().nonnegative().optional(),
    effectiveEarliestSlot: z.coerce.date().optional(),
    dietChart: z.array(DietChartSchema).optional(),
    poRenewalReminder: z.number().min(0).max(100).optional(),
    clientReportCandance: z.enum(Object.values(CLIENT_REPORT_CANDANCE_TYPES)).optional(),
    availablePointers: z.array(z.enum(Object.values(CLIENT_REPORT_POINTERS))).optional(),
    tats: z.string().optional(),
    sops: z.string().optional(),
});
export type IUpdateProjectPayload = z.infer<typeof UpdateProjectPayloadSchema>;

//3: move stage ====================================>
export const MoveStagePayloadSchema = z.object({
    to: z.enum(Object.values(PROJECT_STATUS)).openapi({ example: 'live' }),
    reason: z.string().min(1).openapi({ example: 'PO received, project going live' }),
});
export type IMoveStagePayload = z.infer<typeof MoveStagePayloadSchema>;

//4: search ====================================>
export const SearchProjectQuerySchema = z.object({
    name: z.string().optional().openapi({ example: 'Cardio' }),
    status: z.enum(Object.values(PROJECT_STATUS)).optional().openapi({ example: 'live' }),
    therapy: z.enum(Object.values(PROJECT_THERAPY_TYPES)).optional().openapi({ example: 'cardiology' }),
    division: objectId('Division').optional(),
    lead: objectId('Lead').optional(),
    salesRep: objectId('Sales rep').optional(),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchProjectQuery = z.infer<typeof SearchProjectQuerySchema>;
