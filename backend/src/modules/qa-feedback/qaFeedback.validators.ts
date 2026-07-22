import { z } from 'zod';
import { QA_FEEDBACK_STATUS } from './qaFeedback.constants';
import { isValidObjectID } from '../../shared/utils/strings';

//1: create ====================================>
export const CreateQaFeedbackPayloadSchema = z.object({
    pageRoute: z.string().min(1).openapi({ example: '/crm' }),
    pageTitle: z.string().optional().openapi({ example: 'CRM & Sales' }),
    pinXPercent: z.number().min(0).max(100).openapi({ example: 42.5 }),
    pinYPercent: z.number().min(0).max(100).openapi({ example: 18.2 }),
    comment: z.string().min(1).openapi({ example: 'Save button does nothing when clicked here.' }),
});
export type ICreateQaFeedbackPayload = z.infer<typeof CreateQaFeedbackPayloadSchema>;

//2: update (resolve) ====================================>
export const UpdateQaFeedbackPayloadSchema = z.object({
    status: z.enum(Object.values(QA_FEEDBACK_STATUS)).optional().openapi({ example: 'resolved' }),
    resolutionNote: z.string().optional().openapi({ example: 'Fixed in commit abc123' }),
});
export type IUpdateQaFeedbackPayload = z.infer<typeof UpdateQaFeedbackPayloadSchema>;

//3: search ====================================>
export const SearchQaFeedbackQuerySchema = z.object({
    status: z.enum(Object.values(QA_FEEDBACK_STATUS)).optional().openapi({ example: 'open' }),
    pageRoute: z.string().optional().openapi({ example: '/crm' }),
    reportedBy: z
        .string()
        .refine((val) => isValidObjectID(val), { message: 'reportedBy must be a valid ObjectId' })
        .optional(),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchQaFeedbackQuery = z.infer<typeof SearchQaFeedbackQuerySchema>;
