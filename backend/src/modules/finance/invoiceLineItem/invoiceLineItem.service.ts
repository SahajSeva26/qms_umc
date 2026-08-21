// InvoiceLineItem Service
import { HydratedDocument } from 'mongoose';
import { InvoiceLineItemModel, IInvoiceLineItem } from './invoiceLineItem.model';
import { ICreateInvoiceLineItemPayload, ISearchInvoiceLineItemQuery } from './invoiceLineItem.validators';
import { InvoiceService, computeInvoiceTotal, assertCampBillable, assertCampEligibleForBilling } from '../invoice/invoice.service';
import { IInvoice } from '../invoice/invoice.model';
import { INVOICE_STATUS } from '../invoice/invoice.constants';
import { CampService } from '../../operations/camp/camp.service';
import { ProjectService } from '../../crm/project/project.service';
import { withTransaction } from '../../../shared/helpers/transactionHelper';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../../shared/utils/strings';
import { IServiceOptions } from '../../../shared/types/service.types';

type InvoiceLineItemDocument = HydratedDocument<IInvoiceLineItem> | null;

const populate: any[] = [
    { path: 'invoice', select: 'code status tenant' },
    { path: 'camp', select: 'code date status' },
];

// ========================================================================================
// HELPERS
// ========================================================================================

// Line items belong to no tenant of their own — they are scoped transitively through the parent
// invoice, which IS tenant-scoped. Resolving the parent through InvoiceService.get() applies
// ctx.where(), so a forged / cross-tenant invoice id 404s here and never reaches the line items.
const resolveParentInvoice = async (invoiceId: string, ctx: RequestContext): Promise<HydratedDocument<IInvoice>> => {
    const invoice = await InvoiceService.get(invoiceId, ctx);
    if (!invoice) {
        return throwAppError('Invoice not found', StatusCodes.NOT_FOUND);
    }
    return invoice;
};

// Line items are only mutable while the invoice is a draft. Once it is approved/issued/paid the
// billed amounts are locked, so adding/editing/removing a line (which would move the total) is refused.
const assertInvoiceEditable = (invoice: HydratedDocument<IInvoice>) => {
    if (invoice.status !== INVOICE_STATUS.DRAFT) {
        return throwAppError('Line items can only be changed while the invoice is a draft', StatusCodes.CONFLICT);
    }
};

// Line items DRIVE the invoice's money: subtotal = sum of line amounts, total = subtotal + tax -
// discount (the one shared formula). Called after every line mutation, inside the same transaction.
const recomputeInvoiceTotals = async (invoice: HydratedDocument<IInvoice>) => {
    const items = await InvoiceLineItemModel.find({ invoice: invoice._id }).select('amount');
    const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const total = computeInvoiceTotal(subtotal, invoice.tax || 0, invoice.discount || 0);
    if (total < 0) {
        return throwAppError(
            'Invoice discount exceeds the line-item subtotal; adjust the discount first',
            StatusCodes.BAD_REQUEST,
        );
    }
    invoice.subtotal = subtotal;
    invoice.total = total;
    await invoice.save();
};

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

// Line items have no natural key — id is always an ObjectId. Authorized transitively: the actor
// must be able to see the parent invoice, else it 404s (no cross-tenant leak).
const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<InvoiceLineItemDocument> => {
    if (!isValidObjectID(id)) {
        return null;
    }

    const lineItem = await InvoiceLineItemModel.findById(id);
    if (!lineItem) {
        return null;
    }

    // authorize via parent — if the actor can't see the invoice, they can't see its lines
    const invoice = await InvoiceService.get(lineItem.invoice.toString(), ctx);
    if (!invoice) {
        return null;
    }

    if (options?.populate) {
        await lineItem.populate(populate);
    }

    return lineItem;
};

const search = async (filters: ISearchInvoiceLineItemQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { createdAt: 1 };

    //1: scope — resolve + authorize the parent invoice first (404 if the actor can't see it)
    const invoice = await resolveParentInvoice(filters.invoice, ctx);

    //2: line items of that invoice (optionally narrowed to one camp)
    const where: any = { invoice: invoice._id };
    if (filters.camp) {
        where.camp = filters.camp;
    }

    //3: execute queries
    const countPromise = InvoiceLineItemModel.countDocuments(where);
    const dataPromise = InvoiceLineItemModel.find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

const create = async (
    model: ICreateInvoiceLineItemPayload,
    ctx: RequestContext,
): Promise<HydratedDocument<IInvoiceLineItem>> => {
    //1: parent invoice must exist + be visible to the actor, and be a draft. Its project supplies
    // the line amount (campCost) — same source of truth as bulk invoice creation.
    const invoice = await resolveParentInvoice(model.invoice, ctx);
    assertInvoiceEditable(invoice);
    const project = await ProjectService.get(invoice.project.toString(), ctx);
    if (!project) {
        return throwAppError('Invoice project not found', StatusCodes.NOT_FOUND);
    }
    const campCost = project.campCost || 0;
    if (campCost <= 0) {
        return throwAppError('Project has no camp cost set — cannot bill its camps', StatusCodes.BAD_REQUEST);
    }

    //2: camp must exist and belong to the invoice's project (which pins the company too)
    const camp = await CampService.get(model.camp, ctx);
    if (!camp) {
        return throwAppError('Camp not found', StatusCodes.NOT_FOUND);
    }
    if (!camp.project || camp.project.toString() !== project._id.toString()) {
        return throwAppError("Camp does not belong to the invoice's project", StatusCodes.BAD_REQUEST);
    }

    //3: camp must be billable-type and in a billable state (closed / cancelled_charged), and may sit
    // on at most one non-cancelled invoice (no unique index — cancelled frees it)
    assertCampEligibleForBilling(camp);
    await assertCampBillable(camp);

    //4: create the line (at campCost) + recompute the parent's subtotal/total, atomically
    const lineItem = await withTransaction(async () => {
        const entity = new InvoiceLineItemModel({
            invoice: invoice._id,
            camp: model.camp,
            amount: campCost,
        });
        const created = await entity.save();
        await recomputeInvoiceTotals(invoice);
        return created;
    });

    return lineItem;
};

const remove = async (id: string, ctx: RequestContext) => {
    //1: get line item (authorized via parent)
    const lineItem = await InvoiceLineItemService.get(id, ctx);
    if (!lineItem) {
        return throwAppError('Invoice line item not found', StatusCodes.NOT_FOUND);
    }

    //2: parent must be a draft to remove a line
    const invoice = await resolveParentInvoice(lineItem.invoice.toString(), ctx);
    assertInvoiceEditable(invoice);

    //3: delete + recompute the parent, atomically
    await withTransaction(async () => {
        await lineItem.deleteOne();
        await recomputeInvoiceTotals(invoice);
    });

    return lineItem;
};

export const InvoiceLineItemService = {
    get,
    search,
    create,
    remove,
};
