// InvoiceLineItem Validators
import { z } from 'zod';
import { isValidObjectID } from '../../../shared/utils/strings';

const objectId = (label: string) =>
    z.string().refine((val) => isValidObjectID(val), { message: `${label} must be a valid id` });

//1: create ====================================>
// Adds one camp to an existing draft invoice. amount is NOT accepted — it is the invoice project's
// campCost (a snapshot at billing time). There is no update path: a line has no editable field, so
// changing what's billed is a delete + re-add.
export const CreateInvoiceLineItemPayloadSchema = z.object({
    invoice: objectId('Invoice').openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
    camp: objectId('Camp').openapi({ example: '665f0c3a1a2b3c4d5e6f7a8b' }),
});
export type ICreateInvoiceLineItemPayload = z.infer<typeof CreateInvoiceLineItemPayloadSchema>;

//2: search ====================================>
// invoice is REQUIRED — line items have no tenant of their own; they are always scoped through the
// parent invoice (which is tenant-scoped). Listing must therefore name the invoice to scope to.
export const SearchInvoiceLineItemQuerySchema = z.object({
    invoice: objectId('Invoice').openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
    camp: objectId('Camp').optional(),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchInvoiceLineItemQuery = z.infer<typeof SearchInvoiceLineItemQuerySchema>;
