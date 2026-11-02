// Weekly-plan Service
import mongoose, { HydratedDocument } from 'mongoose';
import { WeeklyPlanModel, IWeeklyPlan } from './weekly-plan.model';
import {
    ICreateWeeklyPlanPayload,
    IMoveStagePayload,
    ISearchWeeklyPlanQuery,
    IUpdateWeeklyPlanPayload,
} from './weekly-plan.validators';
import { WEEKLY_PLAN_PERMISSIONS, WEEKLY_PLAN_STATUS, WEEKLY_PLAN_TRANSITION_MAP } from './weekly-plan.constants';
import { canTransition } from '../lead/lead.validators';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../../shared/utils/strings';
import { endOfUTCDay } from '../../../shared/utils/dates';
import { IServiceOptions } from '../../../shared/types/service.types';
import { DivisionService } from '../division/division.service';
import { ContactService } from '../contact/contact.service';
import { LeadService } from '../lead/lead.service';
import { TENANT_PERMISSIONS } from '../../access-management/tenant/tenant.constants';

type WeeklyPlanDocument = HydratedDocument<IWeeklyPlan> | null;

// weekly plans are an INTERNAL sales-planning artifact — no tenant scoping. Each embedded plan
// carries its own tenant (the pharma company being visited); the plan doc itself is owned by the
// sales person and reviewed by their supervisor, so visibility is scoped on those two refs.
const populate: any[] = [
    { path: 'salesPerson' },
    { path: 'supervisor' },
    { path: 'plans.tenant', select: 'name code' },
    { path: 'plans.division', select: 'name code therapy' },
    { path: 'plans.contactPerson' },
    { path: 'plans.lead', select: 'code title status' },
    { path: 'plans.invoice', select: 'code status' },
    { path: 'plans.parent', select: 'code type status' },
];

// ========================================================================================
// HELPERS
// ========================================================================================

// any actor who isn't a full manager (weekly-plan:manage / tenant:manage) sees a weekly plan only
// if they own it (salesPerson) or supervise it (supervisor) — regardless of which lesser permission
// (search / update) got them through the route guard.
const applyOwnScope = (where: any, ctx: RequestContext) => {
    if (!ctx.hasAnyPermissions([WEEKLY_PLAN_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code])) {
        where.$or = [{ salesPerson: ctx.role?._id }, { supervisor: ctx.role?._id }];
    }
};

const isManager = (ctx: RequestContext) =>
    ctx.hasAnyPermissions([WEEKLY_PLAN_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code]);

const myRoleId = (ctx: RequestContext) => (ctx.role?._id || ctx.role?.id)?.toString();

// validate one embedded plan's refs — each plan references its own pharma company (tenant), and the
// division/contactPerson/lead must belong to that company. Mirrors the appointment coherence checks.
const validatePlan = async (plan: any, ctx: RequestContext) => {
    const division = await DivisionService.get(plan.division, ctx);
    if (!division) {
        return throwAppError('Division not found in one of the plans', StatusCodes.NOT_FOUND);
    }
    if (division.tenant.toString() !== plan.tenant) {
        return throwAppError('Division does not belong to the selected company in one of the plans', StatusCodes.BAD_REQUEST);
    }

    const contact = await ContactService.get(plan.contactPerson, ctx);
    if (!contact) {
        return throwAppError('Contact person not found in one of the plans', StatusCodes.NOT_FOUND);
    }
    if (contact.tenant?.toString() !== plan.tenant) {
        return throwAppError('Contact person must belong to the selected company in one of the plans', StatusCodes.BAD_REQUEST);
    }

    if (plan.lead) {
        const lead = await LeadService.get(plan.lead, ctx);
        if (!lead) {
            return throwAppError('Lead not found in one of the plans', StatusCodes.NOT_FOUND);
        }
        if (lead.tenant?.toString() !== plan.tenant) {
            return throwAppError('Lead must belong to the selected company in one of the plans', StatusCodes.BAD_REQUEST);
        }
    }
};

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

// set applies the editable fields for both create and update. salesPerson/supervisor/status are NOT
// set here — salesPerson + supervisor are pinned on create, status only moves through moveStage().
const set = async (model: any, entity: any, ctx: RequestContext): Promise<HydratedDocument<IWeeklyPlan>> => {
    if (model.startDate) {
        entity.startDate = model.startDate;
    }
    if (model.endDate) {
        entity.endDate = model.endDate;
    }

    // plans is a full replace (still capped at 6 by the model validator). Validate every plan's refs
    // before assigning so a bad plan rejects the whole save.
    if (model.plans) {
        for (const plan of model.plans) {
            await validatePlan(plan, ctx);
        }
        entity.plans = model.plans;
    }

    return entity;
};

const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<WeeklyPlanDocument> => {
    // weekly plans have no natural key — look up by ObjectId only
    if (!isValidObjectID(id)) {
        return null;
    }

    const where: mongoose.QueryFilter<IWeeklyPlan> = { _id: id } as any;
    applyOwnScope(where, ctx);

    let query = WeeklyPlanModel.findOne(where);

    if (options?.populate) {
        query = query.populate(populate);
    }

    return await query;
};

const search = async (filters: ISearchWeeklyPlanQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { startDate: -1 };

    //1: default scoping (owner or supervisor, unless a full manager)
    const where: any = {};
    applyOwnScope(where, ctx);

    //2: add search filters
    if (filters.status) {
        where.status = filters.status;
    }
    if (filters.salesPerson) {
        where.salesPerson = filters.salesPerson;
    }
    if (filters.supervisor) {
        where.supervisor = filters.supervisor;
    }
    // date range on the plan's week start; dateTo snapped to end-of-day (UTC) so the whole day is included
    if (filters.dateFrom || filters.dateTo) {
        where.startDate = {};
        if (filters.dateFrom) {
            where.startDate.$gte = filters.dateFrom;
        }
        if (filters.dateTo) {
            where.startDate.$lte = endOfUTCDay(filters.dateTo);
        }
    }

    //3: execute queries
    const countPromise = WeeklyPlanModel.countDocuments(where);
    const dataPromise = WeeklyPlanModel.find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

const create = async (model: ICreateWeeklyPlanPayload, ctx: RequestContext): Promise<HydratedDocument<IWeeklyPlan>> => {
    //1: the supervisor is derived from the creator's role — it's who will approve/reject the plan.
    const supervisor = ctx.role?.supervisor;
    if (!supervisor) {
        return throwAppError(
            'You do not have a supervisor assigned; a weekly plan needs a supervisor to approve it',
            StatusCodes.BAD_REQUEST,
        );
    }

    //2: build entity — salesPerson is the creator (owner), supervisor pinned from the creator's role,
    // status defaults to pending.
    let entity = new WeeklyPlanModel({
        salesPerson: myRoleId(ctx),
        supervisor,
    });

    //3: set validates + applies startDate/endDate/plans
    entity = await set(model, entity, ctx);
    entity = await entity.save();

    return entity;
};

const update = async (id: string, model: IUpdateWeeklyPlanPayload, ctx: RequestContext) => {
    //1: get the plan first (scoped — owner or supervisor can reach it)
    let plan = await WeeklyPlanService.get(id, ctx);
    if (!plan) {
        return throwAppError('Weekly plan not found', StatusCodes.NOT_FOUND);
    }

    //2: only the owner may edit the plan's content — the supervisor can only approve/reject (moveStage)
    if (!isManager(ctx) && plan.salesPerson?.toString() !== myRoleId(ctx)) {
        return throwAppError('Only the owner can edit this weekly plan', StatusCodes.FORBIDDEN);
    }

    //3: apply editable fields (salesPerson/supervisor/status are not touched here)
    plan = await set(model, plan, ctx);
    plan = await plan.save();

    return plan;
};

// moveStage is the ONLY path allowed to change a weekly plan's status.
// approve/reject → only the plan's supervisor (or a manager); resubmit (→pending) → only the owner.
const moveStage = async (id: string, model: IMoveStagePayload, ctx: RequestContext) => {
    //1: get the plan first (scoped)
    let plan = await WeeklyPlanService.get(id, ctx);
    if (!plan) {
        return throwAppError('Weekly plan not found', StatusCodes.NOT_FOUND);
    }

    const from = plan.status as string;
    const to = model.to;

    //2: guard — no-op move
    if (from === to) {
        return throwAppError(`Weekly plan is already in the '${to}' stage`, StatusCodes.BAD_REQUEST);
    }

    //3: guard — transition must be allowed
    if (!canTransition(WEEKLY_PLAN_TRANSITION_MAP, from, to)) {
        return throwAppError(`Invalid stage transition from '${from}' to '${to}'`, StatusCodes.BAD_REQUEST);
    }

    //4: authorize the move by its direction
    const me = myRoleId(ctx);
    if (to === WEEKLY_PLAN_STATUS.APPROVED || to === WEEKLY_PLAN_STATUS.REJECTED) {
        // approval decisions require the manage permission (held by the supervisor / sales head)
        if (!isManager(ctx)) {
            return throwAppError('You do not have permission to approve or reject weekly plans', StatusCodes.FORBIDDEN);
        }
    } else if (to === WEEKLY_PLAN_STATUS.PENDING) {
        // resubmitting a rejected plan belongs to the owner only
        if (!isManager(ctx) && plan.salesPerson?.toString() !== me) {
            return throwAppError('Only the owner can resubmit this weekly plan', StatusCodes.FORBIDDEN);
        }
    }

    //5: append to the append-only journal + flip the cached status (one atomic save).
    // snapshot the actor's identity so history stays true even if the user/role later changes.
    const actorName = `${ctx.user?.firstName || ''} ${ctx.user?.lastName || ''}`.trim();
    (plan.stageHistory as any).push({
        from,
        to,
        reason: model.reason,
        actor: {
            roleId: ctx.role?._id || ctx.role?.id,
            name: actorName || undefined,
            email: ctx.user?.email,
        },
    });
    plan.status = to;
    plan = await plan.save();

    return plan;
};

export const WeeklyPlanService = {
    get,
    search,
    create,
    update,
    moveStage,
};

// ========================================================================================
// EXPORTS
// ========================================================================================
