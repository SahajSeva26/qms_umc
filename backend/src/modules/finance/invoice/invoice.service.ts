// Invoice Service
import mongoose, { HydratedDocument } from 'mongoose';
import { InvoiceModel, IInvoice } from './invoice.model';
import {
    ICreateInvoicePayload,
    IGetInvoiceFilesQuery,
    IInvoiceFileActivatePayload,
    IInvoiceFilePostPayload,
    IInvoiceReportQuery,
    IMoveStagePayload,
    ISearchInvoiceQuery,
    IUpdateInvoicePayload,
} from './invoice.validators';
import {
    INVOICE_COUNTER_ENTITY,
    INVOICE_FILE_CONFIG,
    INVOICE_FILE_ENTITY_TYPE,
    INVOICE_FILE_RELATIONS,
    INVOICE_STATUS,
    INVOICE_TRANSITION_MAP,
} from './invoice.constants';
import { InvoiceLineItemModel } from '../invoiceLineItem/invoiceLineItem.model';
import { FileService } from '../../file/file.service';
import { FileMapper } from '../../file/file.mapper';
import { FILE_STATUS } from '../../file/file.constants';
import { canTransition } from '../../crm/lead/lead.validators';
import { withTransaction } from '../../../shared/helpers/transactionHelper';
import { CounterService } from '../../counter/counter.service';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { isValidObjectID, toObjectId } from '../../../shared/utils/strings';
import { endOfUTCDay } from '../../../shared/utils/dates';
import { IServiceOptions } from '../../../shared/types/service.types';
import { ProjectService } from '../../crm/project/project.service';
import { CampService } from '../../operations/camp/camp.service';
import { BILLING_TYPES, CAMP_STATUSES } from '../../operations/camp/camp.constants';

type InvoiceDocument = HydratedDocument<IInvoice> | null;

const populate: any[] = [
    { path: 'tenant', select: 'name code' },
    // division + executionMode (PO) feed the invoice card's "Client · Division · PO" subtitle
    { path: 'project', select: 'name code status division executionMode', populate: { path: 'division', select: 'name code' } },
];

// The single formula for an invoice's payable total. Exported so the line-item service can reuse
// it when it recomputes the parent invoice after its lines change — one source of truth.
export const computeInvoiceTotal = (subtotal: number, tax: number, discount: number): number =>
    (subtotal || 0) + (tax || 0) - (discount || 0);

// Camp lifecycle states that can be billed: a camp that actually ran (closed) or was cancelled with
// a charge (cancelled_charged — the cancellation fee is billable). Anything earlier hasn't happened.
const BILLABLE_CAMP_STATUSES: string[] = [CAMP_STATUSES.CLOSED, CAMP_STATUSES.CANCELLED_CHARGED];

// A camp is eligible to bill only if it is a BILLABLE-type camp (not a void camp, which must go
// through PO mapping first) AND it has reached a billable lifecycle state (closed / cancelled_charged).
// Exported so both invoice.create (bulk) and the line-item service (single add) enforce the same rule.
export const assertCampEligibleForBilling = (camp: any) => {
    if (camp.billingType !== BILLING_TYPES.BILLABLE) {
        return throwAppError(`Camp ${camp.code} is a void camp and cannot be billed`, StatusCodes.BAD_REQUEST);
    }
    if (!BILLABLE_CAMP_STATUSES.includes(camp.status)) {
        return throwAppError(
            `Camp ${camp.code} must be closed or cancelled-charged before it can be billed`,
            StatusCodes.CONFLICT,
        );
    }
};

// A camp may sit on at most ONE non-cancelled invoice. This is the uniqueness guard (there is no
// unique index — a cancelled invoice frees the camp to be re-billed). Any existing line item that
// points at a still-live (non-cancelled) invoice blocks the camp. Exported so both invoice.create
// (bulk) and the line-item service (single add) enforce the exact same rule.
// NOTE: this is a read-then-write check, so a tiny race exists under concurrent billing of the same
// camp; acceptable for this workflow. Status is read straight off InvoiceModel (integrity check, no
// tenant scoping needed — camps are already tenant-bound via the coherence check at the call site).
export const assertCampBillable = async (camp: any) => {
    const lines = await InvoiceLineItemModel.find({ camp: camp._id }).select('invoice');
    for (const line of lines) {
        const parent = await InvoiceModel.findById(line.invoice).select('status code');
        if (parent && parent.status !== INVOICE_STATUS.CANCELLED) {
            return throwAppError(
                `Camp ${camp.code} is already billed on invoice ${parent.code}`,
                StatusCodes.CONFLICT,
            );
        }
    }
};

// True if the invoice has at least one ACTIVE GRN document in the file module (relation 'grn').
// Used by the grn_signed → paid gate alongside the on-invoice GRN number.
const hasActiveGrnDocument = async (invoiceId: string, ctx: RequestContext): Promise<boolean> => {
    const result = await FileService.search(
        {
            entityId: invoiceId,
            entityType: INVOICE_FILE_ENTITY_TYPE,
            relation: INVOICE_FILE_RELATIONS.GRN,
            status: FILE_STATUS.ACTIVE,
        } as any,
        ctx,
    );
    return result.count > 0;
};

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

// applies the editable invoice-level fields (dates, tax, discount, tally flag), then recomputes
// total. subtotal is NOT set here — it is driven by the invoice's line items (see the line-item
// service). A discount larger than subtotal + tax would make total negative — rejected here.
const set = async (model: any, entity: HydratedDocument<IInvoice>, ctx: RequestContext) => {
    if (model.issueDate) entity.issueDate = model.issueDate;
    if (model.dueDate !== undefined) entity.dueDate = model.dueDate;
    if (model.tax !== undefined) entity.tax = model.tax;
    if (model.discount !== undefined) entity.discount = model.discount;
    if (model.syncToTally !== undefined) entity.syncToTally = model.syncToTally;

    // GRN number (the document is decoupled into the file module — see the invoice file wrapper)
    if (model.grn?.number !== undefined) {
        if (!entity.grn) (entity as any).grn = {};
        (entity as any).grn.number = model.grn.number;
    }

    const total = computeInvoiceTotal(entity.subtotal || 0, entity.tax || 0, entity.discount || 0);
    if (total < 0) {
        return throwAppError('Discount cannot exceed subtotal plus tax', StatusCodes.BAD_REQUEST);
    }
    entity.total = total;

    return entity;
};

const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<InvoiceDocument> => {
    const where: mongoose.QueryFilter<IInvoice> = ctx.where();

    if (isValidObjectID(id)) {
        where._id = id;
    } else {
        where.code = id;
    }

    let query = InvoiceModel.findOne(where);

    if (options?.populate) {
        query = query.populate(populate);
    }

    return await query;
};

const search = async (filters: ISearchInvoiceQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { issueDate: -1 };

    //1: default scoping
    const where: mongoose.QueryFilter<IInvoice> = { ...ctx.where() };

    //2: add search filters
    // a customer actor is already tenant-pinned by ctx.where(); the filter can't override it
    if (filters.tenant && !where.tenant) {
        where.tenant = filters.tenant;
    }
    if (filters.project) where.project = filters.project;
    if (filters.code) where.code = { $regex: filters.code, $options: 'i' };
    if (filters.status) where.status = filters.status;
    // issue-date range — dateTo is snapped to end-of-day (UTC) so the whole end day is included
    if (filters.dateFrom || filters.dateTo) {
        where.issueDate = {};
        if (filters.dateFrom) where.issueDate.$gte = filters.dateFrom;
        if (filters.dateTo) where.issueDate.$lte = endOfUTCDay(filters.dateTo);
    }

    //3: execute queries
    const countPromise = InvoiceModel.countDocuments(where);
    const dataPromise = InvoiceModel.find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    //4: per-invoice line-item (camp) count for the page — one batched aggregate, no N+1. Feeds the
    // invoice card's "N camps" stat.
    const lineItemCounts = await getLineItemCounts(items);

    return { count, items, lineItemCounts };
};

// batched count of line items (one per billed camp) per invoice, for the invoices on the page.
const getLineItemCounts = async (invoices: HydratedDocument<IInvoice>[]): Promise<Record<string, number>> => {
    const invoiceIds = invoices.map((i) => i._id);
    const counts: Record<string, number> = {};
    if (!invoiceIds.length) {
        return counts;
    }
    const groups = await InvoiceLineItemModel.aggregate([
        { $match: { invoice: { $in: invoiceIds } } },
        { $group: { _id: '$invoice', count: { $sum: 1 } } },
    ]);
    for (const id of invoiceIds) {
        counts[id.toString()] = 0;
    }
    for (const g of groups) {
        const key = g._id?.toString();
        if (key in counts) {
            counts[key] = g.count;
        }
    }
    return counts;
};

const create = async (model: ICreateInvoicePayload, ctx: RequestContext): Promise<HydratedDocument<IInvoice>> => {
    //1: source project must exist (scoped to the actor); the invoice inherits its tenant, and each
    // line is billed at the project's campCost — so campCost must be set.
    const project = await ProjectService.get(model.project, ctx);
    if (!project) {
        return throwAppError('Project not found', StatusCodes.NOT_FOUND);
    }
    const campCost = project.campCost || 0;
    if (campCost <= 0) {
        return throwAppError('Project has no camp cost set — cannot bill its camps', StatusCodes.BAD_REQUEST);
    }

    //2: validate EVERY camp up front (all-or-nothing — nothing is created if any camp fails):
    // exists, belongs to this project, and is not already billed on a non-cancelled invoice.
    const campIds = [...new Set(model.camps.map((id) => id.toString()))];
    const camps: any[] = [];
    for (const campId of campIds) {
        const camp = await CampService.get(campId, ctx);
        if (!camp) {
            return throwAppError(`Camp ${campId} not found`, StatusCodes.NOT_FOUND);
        }
        if (!camp.project || camp.project.toString() !== project._id.toString()) {
            return throwAppError(`Camp ${camp.code} does not belong to this project`, StatusCodes.BAD_REQUEST);
        }
        assertCampEligibleForBilling(camp);
        await assertCampBillable(camp);
        camps.push(camp);
    }

    //3: create the invoice + one line per camp (each at campCost), atomically. subtotal is the sum
    // of the lines; set() applies tax/discount/tally and computes the total from it.
    const invoice = await withTransaction(async () => {
        const code: string = await CounterService.next(INVOICE_COUNTER_ENTITY, ctx);
        const entity = new InvoiceModel({
            tenant: project.tenant,
            project: project._id,
            code,
            subtotal: campCost * camps.length,
        });

        let invoice = await set(model, entity, ctx);
        invoice = await invoice.save();

        for (const camp of camps) {
            await new InvoiceLineItemModel({ invoice: invoice._id, camp: camp._id, amount: campCost }).save();
        }

        return invoice;
    });

    return invoice;
};

const update = async (id: string, model: IUpdateInvoicePayload, ctx: RequestContext) => {
    //1: get invoice first (scoped)
    let invoice = await InvoiceService.get(id, ctx);
    if (!invoice) {
        return throwAppError('Invoice not found', StatusCodes.NOT_FOUND);
    }

    //2: apply editable fields (project/tenant/code/status are not touched here)
    invoice = await set(model, invoice, ctx);
    invoice = await invoice.save();

    return invoice;
};

// moveStage is the ONLY path allowed to change an invoice's status.
const moveStage = async (id: string, model: IMoveStagePayload, ctx: RequestContext) => {
    //1: get invoice first (scoped)
    let invoice = await InvoiceService.get(id, ctx);
    if (!invoice) {
        return throwAppError('Invoice not found', StatusCodes.NOT_FOUND);
    }

    const from = invoice.status as string;
    const to = model.to;

    //2: guard — no-op move
    if (from === to) {
        return throwAppError(`Invoice is already in the '${to}' stage`, StatusCodes.BAD_REQUEST);
    }

    //3: guard — transition must be allowed
    if (!canTransition(INVOICE_TRANSITION_MAP, from, to)) {
        return throwAppError(`Invalid stage transition from '${from}' to '${to}'`, StatusCodes.BAD_REQUEST);
    }

    //3.1: GRN gate — an invoice can only be marked paid once receipt is evidenced: a GRN number
    // (on the invoice) OR an uploaded, active GRN document (in the file module) must be present.
    if (to === INVOICE_STATUS.PAID) {
        const hasNumber = !!invoice.grn?.number?.trim();
        const hasDocument = hasNumber ? false : await hasActiveGrnDocument(invoice._id.toString(), ctx);
        if (!hasNumber && !hasDocument) {
            return throwAppError(
                'A GRN number or GRN document is required before the invoice can be marked paid',
                StatusCodes.UNPROCESSABLE_ENTITY,
            );
        }
    }

    //4: append to the append-only journal + flip the cached status (one atomic save)
    // snapshot the actor's identity from the token so history stays true even if the user/role later changes
    const actorName = `${ctx.user?.firstName || ''} ${ctx.user?.lastName || ''}`.trim();
    invoice.stageHistory.push({
        from,
        to,
        reason: model.reason,
        actor: {
            roleId: ctx.role?._id || ctx.role?.id,
            name: actorName || undefined,
            email: ctx.user?.email,
        },
    } as any);
    invoice.status = to;
    invoice = await invoice.save();

    return invoice;
};

// tenant-wide (scoped) billing totals + per-status breakdown — feeds the pipeline KPI strip, which
// otherwise can only sum the current page. Global for a platform actor (ctx.where() returns {}),
// own-tenant for a customer; optional tenant/project/date filters narrow it for detail views.
const report = async (filters: IInvoiceReportQuery, ctx: RequestContext) => {
    const where: mongoose.QueryFilter<IInvoice> = { ...ctx.where() };

    // a customer actor is already tenant-pinned by ctx.where(); the filter can't override it.
    // cast to ObjectId — this is an aggregation $match, which (unlike find()) does NOT auto-cast.
    if (filters.tenant && !where.tenant) where.tenant = toObjectId(filters.tenant);
    if (filters.project) where.project = toObjectId(filters.project);
    if (filters.dateFrom || filters.dateTo) {
        where.issueDate = {};
        if (filters.dateFrom) where.issueDate.$gte = filters.dateFrom;
        if (filters.dateTo) where.issueDate.$lte = endOfUTCDay(filters.dateTo);
    }

    const [result] = await InvoiceModel.aggregate([
        { $match: where },
        {
            $facet: {
                totals: [{ $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$total' } } }],
                statusCounts: [{ $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total' } } }],
            },
        },
    ]);

    const totals = result?.totals?.[0] || { count: 0, total: 0 };
    return {
        totalInvoices: totals.count,
        totalInvoiced: totals.total,
        statusCounts: (result?.statusCounts || []).map((s: any) => ({
            status: s._id,
            count: s.count,
            total: s.total,
        })),
    };
};

// ========================================================================================
// FILE WRAPPER (decoupled — files live in the file module, keyed by entity {type:'invoice', relation})
// ========================================================================================

// POST /invoices/files — create upload intent(s) for an invoice file relation (e.g. the GRN document).
// Resolves + authorizes the invoice via the own-scoped get() (+ the route permission guard), validates
// the relation + each file (mime/size), gates on invoice status, enforces the per-relation cap, then
// creates a draft file per entry via the file module and returns a presigned PUT uploadUrl for each.
const invoiceFiles = async (model: IInvoiceFilePostPayload, ctx: RequestContext) => {
    //1: get the invoice (scoped) — if the caller can't see it, 404
    const invoice = await InvoiceService.get(model.entityId, ctx);
    if (!invoice) {
        return throwAppError('Invoice not found', StatusCodes.NOT_FOUND);
    }

    //2: per-relation config
    const config = INVOICE_FILE_CONFIG[model.relation];
    if (!config) {
        return throwAppError(`Unknown invoice file relation "${model.relation}"`, StatusCodes.BAD_REQUEST);
    }

    //3: per-file constraints — mime type + size (before any create)
    for (const file of model.files) {
        if (!config.mimeTypes.includes(file.fileType)) {
            return throwAppError(
                `"${file.fileName}" has an unsupported type "${file.fileType}" — "${model.relation}" allows ${config.mimeTypes.join(', ')}`,
                StatusCodes.BAD_REQUEST,
            );
        }
        if (file.fileSize > config.maxSize) {
            return throwAppError(
                `"${file.fileName}" is too large — "${model.relation}" allows at most ${config.maxSize} bytes per file`,
                StatusCodes.BAD_REQUEST,
            );
        }
    }

    //4: status gate — files for this relation may only be uploaded while the invoice is in an allowed status
    if (!config.statusAllowed.includes(invoice.status as string)) {
        return throwAppError(
            `"${model.relation}" files can only be uploaded while the invoice is ${config.statusAllowed.join(' or ')}`,
            StatusCodes.CONFLICT,
        );
    }

    //5: cap check — existing ACTIVE files for this invoice+relation + the requested count must not exceed
    // the relation's cap. The file module doesn't enforce caps, so we own it here.
    const existing = await FileService.search(
        { entityId: invoice._id.toString(), entityType: INVOICE_FILE_ENTITY_TYPE, relation: model.relation, status: FILE_STATUS.ACTIVE } as any,
        ctx,
    );
    if (existing.count + model.files.length > config.cap) {
        return throwAppError(
            `"${model.relation}" allows at most ${config.cap} file(s); ${existing.count} already present`,
            StatusCodes.CONFLICT,
        );
    }

    //6: create a draft file per entry via the file module — each returns a presigned PUT uploadUrl. The
    // frontend PUTs the bytes to each url, then flips the batch active via POST /invoices/files/activate.
    const tenantId = (invoice.tenant as any)?._id?.toString() || invoice.tenant?.toString();
    const created = await FileService.create(
        {
            tenant: tenantId,
            entity: { id: invoice._id.toString(), type: INVOICE_FILE_ENTITY_TYPE, relation: model.relation },
            files: model.files,
        } as any,
        ctx,
    );

    return created.map((file) => FileMapper.toResponse(file, ctx));
};

// POST /invoices/files/activate — flip the invoice's uploaded draft files to active. Authorizes via the
// own-scoped get(), verifies the files belong to THIS invoice, then delegates the draft → active flip to
// the file module (which verifies each object exists in S3).
const invoiceFileActivate = async (model: IInvoiceFileActivatePayload, ctx: RequestContext) => {
    //1: get the invoice (scoped)
    const invoice = await InvoiceService.get(model.entityId, ctx);
    if (!invoice) {
        return throwAppError('Invoice not found', StatusCodes.NOT_FOUND);
    }

    //2: every file must belong to THIS invoice — stops this route activating another invoice's files
    for (const id of model.fileIds) {
        const file = await FileService.get(id, ctx);
        if (!file || file.entity?.type !== INVOICE_FILE_ENTITY_TYPE || file.entity?.id?.toString() !== invoice._id.toString()) {
            return throwAppError(`File "${id}" does not belong to this invoice`, StatusCodes.BAD_REQUEST);
        }
    }

    //3: delegate the draft → active flip to the file module (verifies each S3 object exists first)
    const activated = await FileService.bulkActivate({ fileIds: model.fileIds }, ctx);
    return activated.map((file) => FileMapper.toResponse(file, ctx));
};

// GET /invoices/files?entityId=&relation= — list an invoice's ACTIVE files (optionally for one relation),
// with presigned read URLs. Authorization = "can the caller read this invoice" (own-scoped get()).
const getInvoiceFiles = async (query: IGetInvoiceFilesQuery, ctx: RequestContext) => {
    //1: get the invoice (scoped) — if the caller can't read it, 404
    const invoice = await InvoiceService.get(query.entityId, ctx);
    if (!invoice) {
        return throwAppError('Invoice not found', StatusCodes.NOT_FOUND);
    }

    //2: list the invoice's active files (optionally narrowed to one relation), with presigned read URLs
    const result = await FileService.search(
        { entityId: invoice._id.toString(), entityType: INVOICE_FILE_ENTITY_TYPE, relation: query.relation, status: FILE_STATUS.ACTIVE } as any,
        ctx,
        { withUrls: true } as any,
    );
    return FileMapper.toSearchResponse(result, ctx);
};

// DELETE /invoices/files/:id — discard one of an invoice's files (soft-delete → discarded). Since the cap
// counts ACTIVE files only, this frees the relation's cap so a replacement can be uploaded. The owning
// invoice is derived from the file's own entity ref, then authorized via the own-scoped get().
const invoiceFileDiscard = async (fileId: string, ctx: RequestContext) => {
    //1: load the file (scoped) + confirm it's an invoice file
    const file = await FileService.get(fileId, ctx);
    if (!file || file.entity?.type !== INVOICE_FILE_ENTITY_TYPE || !file.entity?.id) {
        return throwAppError('Invoice file not found', StatusCodes.NOT_FOUND);
    }

    //2: load the owning invoice (scoped) to authorize the caller
    const invoice = await InvoiceService.get(file.entity.id.toString(), ctx);
    if (!invoice) {
        return throwAppError('Invoice not found', StatusCodes.NOT_FOUND);
    }

    //3: soft-delete (draft or active → discarded); frees the relation's cap for a re-upload
    const discarded = await FileService.changeStatus(fileId, { status: FILE_STATUS.DISCARDED }, ctx);
    return FileMapper.toResponse(discarded, ctx);
};

export const InvoiceService = {
    get,
    search,
    create,
    update,
    moveStage,
    report,
    invoiceFiles,
    invoiceFileActivate,
    getInvoiceFiles,
    invoiceFileDiscard,
};
