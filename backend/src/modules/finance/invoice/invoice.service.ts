// Invoice Service
import mongoose, { HydratedDocument } from 'mongoose';
import { InvoiceModel, IInvoice } from './invoice.model';
import { ICreateInvoicePayload, IMoveStagePayload, ISearchInvoiceQuery, IUpdateInvoicePayload } from './invoice.validators';
import { INVOICE_COUNTER_ENTITY, INVOICE_STATUS, INVOICE_TRANSITION_MAP } from './invoice.constants';
import { InvoiceLineItemModel } from '../invoiceLineItem/invoiceLineItem.model';
import { canTransition } from '../../crm/lead/lead.validators';
import { withTransaction } from '../../../shared/helpers/transactionHelper';
import { CounterService } from '../../counter/counter.service';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../../shared/utils/strings';
import { endOfUTCDay } from '../../../shared/utils/dates';
import { IServiceOptions } from '../../../shared/types/service.types';
import { ProjectService } from '../../crm/project/project.service';
import { CampService } from '../../operations/camp/camp.service';
import { BILLING_TYPES, CAMP_STATUSES } from '../../operations/camp/camp.constants';

type InvoiceDocument = HydratedDocument<IInvoice> | null;

const populate: any[] = [
    { path: 'tenant', select: 'name code' },
    { path: 'project', select: 'name code status' },
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
    if (filters.project) where.project = filters.project;
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

    return { count, items };
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

export const InvoiceService = {
    get,
    search,
    create,
    update,
    moveStage,
};
