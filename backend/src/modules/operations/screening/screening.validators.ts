// Screening Validators
import { z } from 'zod';
import { SCREENING_STATUS } from './screening.constants';
import { isValidObjectID } from '../../../shared/utils/strings';

const objectId = (label: string) =>
    z.string().refine((val) => isValidObjectID(val), { message: `${label} must be a valid id` });

//1: create ====================================>
// tenant is derived from the camp (never supplied). The consent OTP is generated server-side;
// the caller may pass an optional signature captured at registration. status starts pending.
export const CreateScreeningPayloadSchema = z.object({
    patient: objectId('Patient').openapi({ example: '665f1a2b3c4d5e6f70819293' }),
    camp: objectId('Camp').openapi({ example: '665f1a2b3c4d5e6f70819294' }),
    symptoms: z.array(z.string().min(1)).optional().openapi({ example: ['fatigue', 'frequent thirst'] }),
    referral: z.boolean().optional().openapi({ example: false }),
    signature: z.string().min(1).optional().openapi({ example: 'data:image/png;base64,...' }),
});
export type ICreateScreeningPayload = z.infer<typeof CreateScreeningPayloadSchema>;

//2: update ====================================>
// patient / camp / tenant are immutable; consent is changed via verify-consent; status via moveStage.
export const UpdateScreeningPayloadSchema = z.object({
    symptoms: z.array(z.string().min(1)).optional(),
    referral: z.boolean().optional(),
});
export type IUpdateScreeningPayload = z.infer<typeof UpdateScreeningPayloadSchema>;

//3: search ====================================>
export const SearchScreeningQuerySchema = z.object({
    patient: z.string().optional().openapi({ example: '665f1a2b3c4d5e6f70819293' }),
    camp: z.string().optional().openapi({ example: '665f1a2b3c4d5e6f70819294' }),
    // the field officer who performed the screening (its `camp.fo`) — only honoured for a
    // screening:manage actor; a non-manage actor stays pinned to their own via own-scope.
    performedBy: z.string().optional().openapi({ example: '665f1a2b3c4d5e6f70819295' }),
    status: z.enum(Object.values(SCREENING_STATUS)).optional().openapi({ example: 'pending' }),
    referral: z.coerce.boolean().optional().openapi({ example: true }),
    // only honoured for a screening:manage actor not already tenant-pinned
    tenant: z.string().optional().openapi({ example: '665f1a2b3c4d5e6f70819200' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchScreeningQuery = z.infer<typeof SearchScreeningQuerySchema>;

//4: move stage ====================================>
export const MoveStagePayloadSchema = z.object({
    to: z.enum(Object.values(SCREENING_STATUS)).openapi({ example: 'completed' }),
    reason: z.string().min(1).openapi({ example: 'Screening completed at the camp' }),
});
export type IMoveStagePayload = z.infer<typeof MoveStagePayloadSchema>;

//5: verify consent ====================================>
// the patient-provided OTP is matched against the stored one; an optional signature may accompany it.
export const VerifyConsentPayloadSchema = z.object({
    otp: z.string().min(1).openapi({ example: '004213' }),
    signature: z.string().min(1).optional().openapi({ example: 'data:image/png;base64,...' }),
});
export type IVerifyConsentPayload = z.infer<typeof VerifyConsentPayloadSchema>;

//6: report ====================================>
// No filters: the report is a current-state snapshot of the screenings already visible to the
// actor (tenant scope is applied in the service). Deliberately empty — a date window would imply
// the counts are time-filtered, which they are not.
export const ScreeningReportQuerySchema = z.object({});
export type IScreeningReportQuery = z.infer<typeof ScreeningReportQuerySchema>;
