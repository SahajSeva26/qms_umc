// Invoice Validators
import { z } from 'zod';
import { INVOICE_STATUS } from './invoice.constants';
import { isValidObjectID } from '../../../shared/utils/strings';

const objectId = (label: string) =>
    z.string().refine((val) => isValidObjectID(val), { message: `${label} must be a valid id` });

//1: create ====================================>
// tenant is NOT accepted here — it is derived from the source project.
// subtotal is NOT accepted — it is the sum of the line items (one per camp, at the project campCost).
// total is NOT accepted — it is computed from subtotal + tax - discount.
export const CreateInvoicePayloadSchema = z.object({
    project: objectId('Project').openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
    // the camps to bill on this invoice — each becomes a line item at the project's campCost.
    // Every camp must exist, belong to this project, and not already be on a non-cancelled invoice.
    camps: z.array(objectId('Camp')).min(1).openapi({ example: ['665f0c3a1a2b3c4d5e6f7a8b'] }),
    issueDate: z.coerce.date().optional().openapi({ example: '2026-08-21' }),
    dueDate: z.coerce.date().optional().openapi({ example: '2026-09-20' }),
    tax: z.number().nonnegative().optional().openapi({ example: 90000 }),
    discount: z.number().nonnegative().optional().openapi({ example: 10000 }),
    syncToTally: z.boolean().optional().openapi({ example: false }),
});
export type ICreateInvoicePayload = z.infer<typeof CreateInvoicePayloadSchema>;

//2: update ====================================>
// project/tenant/code/status/subtotal are NOT editable here — status moves through moveStage(),
// subtotal is driven by line items.
export const UpdateInvoicePayloadSchema = z.object({
    issueDate: z.coerce.date().optional(),
    dueDate: z.coerce.date().optional(),
    tax: z.number().nonnegative().optional(),
    discount: z.number().nonnegative().optional(),
    syncToTally: z.boolean().optional(),
});
export type IUpdateInvoicePayload = z.infer<typeof UpdateInvoicePayloadSchema>;

//3: move stage ====================================>
export const MoveStagePayloadSchema = z.object({
    to: z.enum(Object.values(INVOICE_STATUS)).openapi({ example: 'approved' }),
    reason: z.string().min(1).openapi({ example: 'Approved by accounts, ready to issue' }),
});
export type IMoveStagePayload = z.infer<typeof MoveStagePayloadSchema>;

//4: search ====================================>
export const SearchInvoiceQuerySchema = z.object({
    project: objectId('Project').optional(),
    status: z.enum(Object.values(INVOICE_STATUS)).optional().openapi({ example: 'issued' }),
    dateFrom: z.coerce.date().optional().openapi({ example: '2026-08-01' }),
    dateTo: z.coerce.date().optional().openapi({ example: '2026-08-31' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchInvoiceQuery = z.infer<typeof SearchInvoiceQuerySchema>;
