import mongoose, { HydratedDocument } from 'mongoose';
import { ILead, LeadModel } from './lead.model';
import {
    ICreateLeadPayload,
    ILeadReportQuery,
    IMoveStagePayload,
    ISearchLeadQuery,
    IUpdateLeadPayload,
    canTransition,
} from './lead.validators';
import {
    LEAD_COUNTER_ENTITY,
    LEAD_PERMISSIONS,
    LEAD_REPORT_DEFAULT_TREND_DAYS,
    LEAD_STATUSES,
    LEAD_TRANSITION_MAP,
} from './lead.constants';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../../shared/utils/strings';
import { IServiceOptions } from '../../../shared/types/service.types';
import { DivisionService } from '../division/division.service';
import { RoleService } from '../../access-management/role/role.service';
import { ContactService } from '../contact/contact.service';
import { TENANT_TYPE } from '../../access-management/tenant/tenant.constants';
import { TenantService } from '../../access-management/tenant/tenant.service';
import { withTransaction } from '../../../shared/helpers/transactionHelper';
import { CounterService } from '../../counter/counter.service';
import { endOfUTCDay, startOfUTCDay } from '../../../shared/utils/dates';
import { AppointmentModel } from '../appointment/appointment.model';

type LeadDocument = HydratedDocument<ILead> | null;

const populate: any[] = [
    { path: 'tenant', select: 'name code' },
    { path: 'division', select: 'name code therapy' },
    { path: 'contactPerson' },
    { path: 'salesPerson' },
];

// ========================================================================================
// HELPERS
// ========================================================================================

// any actor without lead:manage can only see their own leads (system:manage / lead:manage see all)
const applyOwnScope = (where: any, ctx: RequestContext) => {
    if (!ctx.hasAnyPermissions([LEAD_PERMISSIONS.MANAGE.code])) {
        where.salesPerson = ctx.role?._id || ctx.role?.id;
    }
};

// a lead's salesPerson must exist and be QMS internal (platform) staff
const assertPlatformSalesPerson = async (salesPersonId: string, ctx: RequestContext) => {
    const salesPerson = await RoleService.get(salesPersonId, ctx, { populate: true });
    if (!salesPerson) {
        return throwAppError('Sales person not found', StatusCodes.NOT_FOUND);
    }
    if ((salesPerson.tenant as any)?.type !== TENANT_TYPE.PLATFORM) {
        return throwAppError('Sales person must be QMS internal staff', StatusCodes.BAD_REQUEST);
    }
    return salesPerson;
};

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

const set = async (model: any, entity: HydratedDocument<ILead>, ctx: RequestContext) => {
    // contactPerson must exist and belong to the lead's own tenant (the pharma company).
    // entity.tenant is set before set() runs — derived from division on create, loaded doc on update.
    if (model.contactPerson) {
        const contactPerson = await ContactService.get(model.contactPerson, ctx, { populate: true });
        if (!contactPerson) {
            return throwAppError('Contact person not found', StatusCodes.NOT_FOUND);
        }
        if ((contactPerson.tenant as any)?._id?.toString() !== entity.tenant?.toString()) {
            return throwAppError('Contact person must belong to the selected company', StatusCodes.BAD_REQUEST);
        }
        entity.contactPerson = model.contactPerson;
    }

    // salesPerson is intentionally NOT handled here — create() defaults/validates it and update()
    // gates changes to managers (see those functions).

    if (model.title) entity.title = model.title;
    if (model.problemStatement) entity.problemStatement = model.problemStatement;
    if (model.numberOfMRS !== undefined) entity.numberOfMRS = model.numberOfMRS;
    if (model.projectType) entity.projectType = model.projectType;
    if (model.focusTherapy) entity.focusTherapy = model.focusTherapy;
    if (model.focusTherapyDoctor) entity.focusTherapyDoctor = model.focusTherapyDoctor;
    if (model.currentlyDoing) entity.currentlyDoing = model.currentlyDoing;
    if (model.offers) entity.offers = model.offers;
    if (model.notes !== undefined) entity.notes = model.notes;
    if (model.estimatedValue !== undefined) entity.estimatedValue = model.estimatedValue;
    if (model.confidence !== undefined) entity.confidence = model.confidence;
    if (model.followUpDate) entity.followUpDate = model.followUpDate;

    return entity;
};

const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<LeadDocument> => {
    const where: mongoose.QueryFilter<ILead> = ctx.where();
    if (isValidObjectID(id)) {
        where._id = id;
    } else {
        where.code = id;
    }

    applyOwnScope(where, ctx);

    let query = LeadModel.findOne(where);

    if (options?.populate) {
        query = query.populate(populate);
    }

    return await query;
};

const search = async (filters: ISearchLeadQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { updatedAt: -1 };

    //1: add default scoping
    const where: mongoose.QueryFilter<ILead> = { ...ctx.where() };

    //2: add search filters
    if (filters.title) {
        where.title = { $regex: filters.title, $options: 'i' };
    }
    if (filters.code) {
        where.code = { $regex: filters.code, $options: 'i' };
    }
    if (filters.focusTherapy) {
        // regex against an array field — Mongo matches if any element matches
        where.focusTherapy = { $regex: filters.focusTherapy, $options: 'i' };
    }
    if (filters.status) {
        where.status = filters.status;
    }
    if (filters.projectType) {
        where.projectType = filters.projectType;
    }
    if (filters.division) {
        where.division = filters.division;
    }
    if (filters.salesPerson) {
        where.salesPerson = filters.salesPerson;
    }
    // fyFrom / fyTo — bound the lead's creation date (financial-year range). Dates are already
    // parsed + validated (fyFrom <= fyTo) in the validators; normalize to inclusive UTC day bounds.
    if (filters.fyFrom || filters.fyTo) {
        where.createdAt = {};
        if (filters.fyFrom) {
            where.createdAt.$gte = startOfUTCDay(filters.fyFrom);
        }
        if (filters.fyTo) {
            where.createdAt.$lte = endOfUTCDay(filters.fyTo);
        }
    }

    //3: own-scope LAST so it always wins — a non-manage actor can never widen past their own leads
    //   by passing a salesPerson filter
    applyOwnScope(where, ctx);

    //4: execute queries
    const countPromise = LeadModel.countDocuments(where);
    const dataPromise = LeadModel.find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    //5: optional report — per-lead follow-up count (every appointment linked to the lead) for this page
    const stats = filters.report === 'true' ? await getLeadFollowUpStats(items) : undefined;

    return { count, items, stats };
};

// per-lead rollup: total follow-ups = every appointment linked to the lead (all statuses).
// One aggregate for the whole page (batched $in), so no N+1.
type LeadStats = {
    followUps: number;
};

const getLeadFollowUpStats = async (leads: HydratedDocument<ILead>[]): Promise<Record<string, LeadStats>> => {
    const leadIds = leads.map((l) => l._id);

    const groups = await AppointmentModel.aggregate([
        { $match: { lead: { $in: leadIds } } },
        { $group: { _id: '$lead', count: { $sum: 1 } } },
    ]);

    const stats: Record<string, LeadStats> = {};
    for (const id of leadIds) {
        stats[id.toString()] = { followUps: 0 };
    }
    for (const g of groups) {
        const entry = stats[g._id?.toString()];
        if (entry) {
            entry.followUps = g.count;
        }
    }
    return stats;
};

const create = async (model: ICreateLeadPayload, ctx: RequestContext): Promise<HydratedDocument<ILead>> => {
    //1: division must exist (scoped to the actor); the lead inherits its tenant
    const division = await DivisionService.get(model.division, ctx);
    if (!division) {
        return throwAppError('Division not found', StatusCodes.NOT_FOUND);
    }

    //2: guard — the chosen division must belong to the selected tenant (catches mismatched selection)
    if (division.tenant.toString() !== model.tenant) {
        return throwAppError('Division does not belong to the selected company', StatusCodes.BAD_REQUEST);
    }

    //2b: resolve the salesPerson — a lead defaults to the company's assigned sales person
    //    (tenant.salesPerson). A manager may override with a different one; a non-manager may not.
    //    When the company has no assigned sales person, the payload sales person (any) is required.
    const tenant = await TenantService.get(division.tenant.toString(), ctx);
    if (!tenant) {
        return throwAppError('Tenant not found', StatusCodes.NOT_FOUND);
    }

    //2a: guard — a lead can only belong to a customer (pharma) company, never a platform tenant.
    // Divisions are already customer-only in practice, but assert it here as defense-in-depth so a
    // division that somehow exists under a platform tenant can never seed a platform-tenant lead.
    if (tenant.type !== TENANT_TYPE.CUSTOMER) {
        return throwAppError('Leads can only be created for customer (pharma) companies', StatusCodes.BAD_REQUEST);
    }

    let salesPersonId: string | undefined;
    if (tenant?.salesPerson) {
        salesPersonId = tenant.salesPerson.toString();
        if (model.salesPerson && model.salesPerson !== salesPersonId) {
            if (!ctx.hasAnyPermissions([LEAD_PERMISSIONS.MANAGE.code])) {
                return throwAppError('Only a manager can assign this company’s lead to a different sales person', StatusCodes.FORBIDDEN);
            }
            salesPersonId = model.salesPerson; // manager override
        }
    } else {
        salesPersonId = model.salesPerson;
        if (!salesPersonId) {
            return throwAppError('A sales person is required', StatusCodes.BAD_REQUEST);
        }
    }
    //2c: the resolved sales person must be QMS internal (platform) staff
    await assertPlatformSalesPerson(salesPersonId, ctx);

    const lead = await withTransaction(async () => {
        const code: string = await CounterService.next(LEAD_COUNTER_ENTITY, ctx);
        //3: build entity — tenant is derived from the division (the pharma company, source of truth).
        // tenant must be set before set() so it can validate the contactPerson against it.
        let entity = new LeadModel({
            tenant: division.tenant,
            division: division._id,
            salesPerson: salesPersonId,
            code,
        });

        //4: set validates + applies contactPerson and the remaining fields
        entity = await set(model, entity, ctx);
        entity = await entity.save();
        return entity;
    });

    return lead;
};

const update = async (id: string, model: IUpdateLeadPayload, ctx: RequestContext) => {
    //1: get lead first (scoped — a non-manager can only reach their own lead)
    let lead = await LeadService.get(id, ctx);
    if (!lead) {
        return throwAppError('Lead not found', StatusCodes.NOT_FOUND);
    }

    //2: salesPerson can only be changed by a manager (override allowed); a non-manager cannot reassign
    if (model.salesPerson !== undefined) {
        if (!ctx.hasAnyPermissions([LEAD_PERMISSIONS.MANAGE.code])) {
            return throwAppError('Only a manager can change the sales person of a lead', StatusCodes.FORBIDDEN);
        }
        await assertPlatformSalesPerson(model.salesPerson, ctx);
        lead.salesPerson = model.salesPerson as any;
    }

    //3: apply the remaining editable fields (status/division/tenant/salesPerson are not touched here)
    lead = await set(model, lead, ctx);
    lead = await lead.save();

    return lead;
};

// moveStage is the ONLY path allowed to change a lead's status.
const moveStage = async (id: string, model: IMoveStagePayload, ctx: RequestContext) => {
    //1: get lead first (scoped)
    let lead = await LeadService.get(id, ctx);
    if (!lead) {
        return throwAppError('Lead not found', StatusCodes.NOT_FOUND);
    }

    const from = lead.status as string;
    const to = model.to;

    //2: guard — no-op move
    if (from === to) {
        return throwAppError(`Lead is already in the '${to}' stage`, StatusCodes.BAD_REQUEST);
    }

    //3: guard — transition must be allowed
    if (!canTransition(LEAD_TRANSITION_MAP, from, to)) {
        return throwAppError(`Invalid stage transition from '${from}' to '${to}'`, StatusCodes.BAD_REQUEST);
    }

    //4: append to the append-only journal + flip the cached status (one atomic save)
    // snapshot the actor's identity from the token so history stays true even if the user/role later changes
    const actorName = `${ctx.user?.firstName || ''} ${ctx.user?.lastName || ''}`.trim();
    lead.stageHistory.push({
        from,
        to,
        reason: model.reason,
        actor: {
            roleId: ctx.role?._id || ctx.role?.id,
            name: actorName || undefined,
            email: ctx.user?.email,
        },
    } as any);
    lead.status = to;
    lead = await lead.save();

    return lead;
};


const enumerateDays = (from: Date, to: Date): string[] => {
    const days: string[] = [];
    const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
    const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
    while (cursor <= end) {
        days.push(cursor.toISOString().slice(0, 10));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return days;
};


const TERMINAL_LEAD_STATUSES = Object.entries(LEAD_TRANSITION_MAP)
    .filter(([, next]) => next.length === 0)
    .map(([status]) => status);

const report = async (filters: ILeadReportQuery, ctx: RequestContext) => {
    //1: scope — same layering as search(): ctx.where() first, then the caller's own filters
    const where: mongoose.QueryFilter<ILead> = { ...ctx.where() };
    if (filters.division) {
        where.division = filters.division as any;
    }
    if (filters.salesPerson) {
        where.salesPerson = filters.salesPerson as any;
    }
    if (filters.projectType) {
        where.projectType = filters.projectType;
    }

    //2: trend window — defaults to the last LEAD_REPORT_DEFAULT_TREND_DAYS days
    const to = filters.to ? endOfUTCDay(filters.to) : endOfUTCDay(new Date());
    const from = filters.from
        ? startOfUTCDay(filters.from)
        : startOfUTCDay(new Date(to.getTime() - LEAD_REPORT_DEFAULT_TREND_DAYS * 24 * 60 * 60 * 1000));

    //single aggregation, single collection scan.
    const [result] = await LeadModel.aggregate([
        { $match: where },
        {
            $facet: {
                totalLeads: [{ $count: 'count' }],
                statusCounts: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
                projectTypeCounts: [{ $group: { _id: '$projectType', count: { $sum: 1 } } }],
                newLeadsTrend: [
                    { $match: { createdAt: { $gte: from, $lte: to } } },
                    {
                        $group: {
                            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } },
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { _id: 1 } },
                ],
                // KPI strip facets — all scoped to `where` (same as the summary). Value tiles use
                // estimatedValue; windowed tiles (won/lost in range) use the from/to INPUT range;
                // velocity + topRep are all-time. Avg AI Score omitted (no scoring model exists).
                pipelineValue: [
                    { $match: { status: { $nin: [LEAD_STATUSES.WON, LEAD_STATUSES.LOST] } } },
                    { $group: { _id: null, value: { $sum: '$estimatedValue' } } },
                ],
                avgDealSize: [
                    { $match: { status: LEAD_STATUSES.WON } },
                    { $group: { _id: null, value: { $avg: '$estimatedValue' } } },
                ],
                // won leads whose WON transition happened within [from, to]
                wonInRange: [
                    { $match: { stageHistory: { $elemMatch: { to: LEAD_STATUSES.WON, createdAt: { $gte: from, $lte: to } } } } },
                    { $group: { _id: null, count: { $sum: 1 }, value: { $sum: '$estimatedValue' } } },
                ],
                // lost leads whose LOST transition happened within [from, to] — feeds win rate
                lostInRange: [
                    { $match: { stageHistory: { $elemMatch: { to: LEAD_STATUSES.LOST, createdAt: { $gte: from, $lte: to } } } } },
                    { $count: 'count' },
                ],
                // all-time avg days from lead creation to its WON transition
                salesVelocity: [
                    { $match: { stageHistory: { $elemMatch: { to: LEAD_STATUSES.WON } } } },
                    {
                        $addFields: {
                            wonEntry: {
                                $first: {
                                    $filter: {
                                        input: '$stageHistory',
                                        as: 'h',
                                        cond: { $eq: ['$$h.to', LEAD_STATUSES.WON] },
                                    },
                                },
                            },
                        },
                    },
                    { $addFields: { days: { $divide: [{ $subtract: ['$wonEntry.createdAt', '$createdAt'] }, 86400000] } } },
                    { $group: { _id: null, avgDays: { $avg: '$days' } } },
                ],
                // all-time top rep by total won value (+ display name via a roles lookup)
                topRep: [
                    { $match: { status: LEAD_STATUSES.WON } },
                    { $group: { _id: '$salesPerson', wonValue: { $sum: '$estimatedValue' }, wonCount: { $sum: 1 } } },
                    { $sort: { wonValue: -1 } },
                    { $limit: 1 },
                    { $lookup: { from: 'roles', localField: '_id', foreignField: '_id', as: 'rep' } },
                    { $unwind: { path: '$rep', preserveNullAndEmptyArrays: true } },
                    { $project: { _id: 0, salesPerson: '$_id', name: '$rep.name', wonValue: 1, wonCount: 1 } },
                ],
            },
        },
    ]);

    const trendCounts = new Map((result?.newLeadsTrend || []).map((r: any) => [r._id, r.count]));
    const newLeadsTrend = enumerateDays(from, to).map((period) => ({
        period,
        count: trendCounts.get(period) || 0,
    }));

    //3: derive the summary numbers from statusCounts — this interprets the status
    const statusCounts = new Map<string, number>((result?.statusCounts || []).map((s: any) => [s._id, s.count]));
    const totalLeads: number = result?.totalLeads?.[0]?.count || 0;
    const converted = statusCounts.get(LEAD_STATUSES.WON) || 0;
    const lost = statusCounts.get(LEAD_STATUSES.LOST) || 0;
    const closed = TERMINAL_LEAD_STATUSES.reduce((sum, status) => sum + (statusCounts.get(status) || 0), 0);
    const open = totalLeads - closed;

    //4: KPI strip — value + stage-timed tiles derived from the facets above
    const wonCountInRange = result?.wonInRange?.[0]?.count || 0;
    const lostCountInRange = result?.lostInRange?.[0]?.count || 0;
    const decidedInRange = wonCountInRange + lostCountInRange;
    const velocityDays = result?.salesVelocity?.[0]?.avgDays;
    const round1 = (n: number) => Math.round(n * 10) / 10;
    const kpis = {
        pipelineValue: result?.pipelineValue?.[0]?.value || 0, // Σ estimatedValue, open leads
        wonValue: result?.wonInRange?.[0]?.value || 0, // Σ estimatedValue, won within [from,to]
        wonCount: wonCountInRange, // # won within [from,to]
        avgDealSize: round1(result?.avgDealSize?.[0]?.value || 0), // avg estimatedValue, won (all-time)
        winRate: decidedInRange > 0 ? round1((wonCountInRange / decidedInRange) * 100) : 0, // % within [from,to]
        salesVelocityDays: velocityDays ? round1(velocityDays) : 0, // avg days created→won (all-time)
        topRep: result?.topRep?.[0] || null, // { salesPerson, name, wonValue, wonCount } | null (all-time)
    };

    return {
        ...result,
        newLeadsTrend,
        summary: { totalLeads, converted, lost, open },
        kpis,
        meta: { from, to },
    };
};

export const LeadService = {
    get,
    search,
    create,
    update,
    moveStage,
    report,
};

// ========================================================================================
// EXPORTS
// ========================================================================================
