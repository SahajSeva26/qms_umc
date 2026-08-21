// InvoiceLineItem Validators
import { z } from 'zod';
import { isValidObjectID } from '../../../shared/utils/strings';

const objectId = (label: string) =>
    z.string().refine((val) => isValidObjectID(val), { message: `${label} must be a valid id` });

//1: create ====================================>
export const CreateInvoiceLineItemPayloadSchema = z.object({
    invoice: objectId('Invoice').openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
    camp: objectId('Camp').openapi({ example: '665f0c3a1a2b3c4d5e6f7a8b' }),
    amount: z.number().nonnegative().openapi({ example: 15000 }),
});
export type ICreateInvoiceLineItemPayload = z.infer<typeof CreateInvoiceLineItemPayloadSchema>;

//2: update ====================================>
// invoice/camp are NOT editable — moving a line to another invoice/camp is a delete + recreate.
export const UpdateInvoiceLineItemPayloadSchema = z.object({
    amount: z.number().nonnegative().openapi({ example: 18000 }),
});
export type IUpdateInvoiceLineItemPayload = z.infer<typeof UpdateInvoiceLineItemPayloadSchema>;

//3: search ====================================>
// invoice is REQUIRED — line items have no tenant of their own; they are always scoped through the
// parent invoice (which is tenant-scoped). Listing must therefore name the invoice to scope to.
export const SearchInvoiceLineItemQuerySchema = z.object({
    invoice: objectId('Invoice').openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
    camp: objectId('Camp').optional(),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchInvoiceLineItemQuery = z.infer<typeof SearchInvoiceLineItemQuerySchema>;
