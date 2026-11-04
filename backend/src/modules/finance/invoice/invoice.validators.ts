// Invoice Validators
import { z } from 'zod';
import { INVOICE_FILE_RELATIONS, INVOICE_STATUS } from './invoice.constants';
import { isValidObjectID } from '../../../shared/utils/strings';
import { FileMetaSchema } from '../../file/file.validators';

const objectId = (label: string) =>
    z.string().refine((val) => isValidObjectID(val), { message: `${label} must be a valid id` });

// GRN sub-object — just the GRN number lives on the invoice; the GRN document is decoupled into the
// file module (see the invoice file routes). The grn_signed → paid transition requires at least one of
// the two — a number here OR an active GRN file — enforced in the service.
const GrnSchema = z.object({
    number: z.string().min(1).optional().openapi({ example: 'GRN-2026-0042' }),
});

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
    grn: GrnSchema.optional(),
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
    tenant: objectId('Tenant').optional(),
    project: objectId('Project').optional(),
    status: z.enum(Object.values(INVOICE_STATUS)).optional().openapi({ example: 'issued' }),
    dateFrom: z.coerce.date().optional().openapi({ example: '2026-08-01' }),
    dateTo: z.coerce.date().optional().openapi({ example: '2026-08-31' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchInvoiceQuery = z.infer<typeof SearchInvoiceQuerySchema>;

//5: report ====================================>
// tenant-wide (scoped) totals + per-status breakdown for the pipeline KPI strip. Same scoping filters
// as search MINUS status (the report IS the status breakdown) and pagination.
export const InvoiceReportQuerySchema = z.object({
    tenant: objectId('Tenant').optional(),
    project: objectId('Project').optional(),
    dateFrom: z.coerce.date().optional().openapi({ example: '2026-08-01' }),
    dateTo: z.coerce.date().optional().openapi({ example: '2026-08-31' }),
});
export type IInvoiceReportQuery = z.infer<typeof InvoiceReportQuerySchema>;

//6: invoice file post ====================================>
// create upload intent(s) for an invoice file relation (e.g. the GRN document). `entityId` = the
// invoice; `files` = one metadata entry per file. The service validates the relation + each file
// (mime/size), gates on invoice status, enforces the cap, then returns a presigned upload URL per file.
export const InvoiceFilePostPayloadSchema = z.object({
    relation: z.enum(Object.values(INVOICE_FILE_RELATIONS) as [string, ...string[]]).openapi({ example: 'grn' }),
    entityId: objectId('Invoice').openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
    files: z
        .array(FileMetaSchema)
        .min(1)
        .openapi({ example: [{ fileName: 'grn.pdf', fileSize: 20480, fileType: 'application/pdf' }] }),
});
export type IInvoiceFilePostPayload = z.infer<typeof InvoiceFilePostPayloadSchema>;

//7: invoice file activate ====================================>
// `entityId` = the invoice whose files these are; `fileIds` = the draft files (already uploaded to S3)
// to flip active. The service verifies the files belong to the invoice, then delegates to the file module.
export const InvoiceFileActivatePayloadSchema = z.object({
    entityId: objectId('Invoice').openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
    fileIds: z.array(objectId('File')).min(1).openapi({ example: ['665f0c3a1a2b3c4d5e6f7a8a'] }),
});
export type IInvoiceFileActivatePayload = z.infer<typeof InvoiceFileActivatePayloadSchema>;

//8: get invoice files ====================================>
// list an invoice's active files; `relation` optionally narrows to one relation (else all relations).
export const GetInvoiceFilesQuerySchema = z.object({
    entityId: objectId('Invoice').openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
    relation: z
        .enum(Object.values(INVOICE_FILE_RELATIONS) as [string, ...string[]])
        .optional()
        .openapi({ example: 'grn' }),
});
export type IGetInvoiceFilesQuery = z.infer<typeof GetInvoiceFilesQuerySchema>;
