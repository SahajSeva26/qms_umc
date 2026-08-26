import mongoose, { HydratedDocument } from 'mongoose';
import { IProject, Project } from './project.model';
import { ICreateProjectPayload, IMoveStagePayload, ISearchProjectQuery, IUpdateProjectPayload } from './project.validators';
import { PROJECT_COUNTER_ENTITY, PROJECT_PERMISSIONS, PROJECT_TRANSITION_MAP } from './project.constants';
import { canTransition } from '../lead/lead.validators';
import { withTransaction } from '../../../shared/helpers/transactionHelper';
import { CounterService } from '../../counter/counter.service';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { isValidObjectID, toObjectId } from '../../../shared/utils/strings';
import { IServiceOptions } from '../../../shared/types/service.types';
import { LeadService } from '../lead/lead.service';
import { RoleService } from '../../access-management/role/role.service';
import { ContactService } from '../contact/contact.service';
import { TENANT_TYPE } from '../../access-management/tenant/tenant.constants';
import { TestService } from '../../operations/test/test.service';

type ProjectDocument = HydratedDocument<IProject> | null;

const populate: any[] = [
    { path: 'tenant', select: 'name code' },
    { path: 'division', select: 'name code therapy' },
    { path: 'lead', select: 'title status' },
    { path: 'salesRep' },
    { path: 'projectCoordinator' },
    { path: 'marketingContact' },
    { path: 'tests', select: 'name code therapy' },
];

// ========================================================================================
// HELPERS
// ========================================================================================

// QMS-internal team members (salesRep/projectCoordina tor) must exist and be platform staff —
// QMS owns project execution in the two-sided model. (marketingContact is customer-side, checked separately.)
const assertPlatformStaff = async (roleId: string, label: string, ctx: RequestContext) => {
    const role = await RoleService.get(roleId, ctx, { populate: true });
    if (!role) {
        return throwAppError(`${label} not found`, StatusCodes.NOT_FOUND);
    }
    if ((role.tenant as any)?.type !== TENANT_TYPE.PLATFORM) {
        return throwAppError(`${label} must be QMS internal staff`, StatusCodes.BAD_REQUEST);
    }
};

// tests reference the global Test catalog — every supplied id must resolve to a real test.
const assertTestsExist = async (testIds: string[], ctx: RequestContext) => {
    const uniqueIds = [...new Set(testIds)];
    for (const id of uniqueIds) {
        const test = await TestService.get(id, ctx);
        if (!test) {
            return throwAppError(`Test not found: ${id}`, StatusCodes.BAD_REQUEST);
        }
    }
};

const applyOwnScope = (where: any, ctx: RequestContext) => {
    // Customer (pharma) users can only see projects in their own division.
    if (ctx.tenant?.type === TENANT_TYPE.CUSTOMER) {
        where.division = toObjectId(ctx.role.division);
        return where;
    }

    // Platform reps without project:manage can only see their own projects.
    if (!ctx.hasAnyPermissions([PROJECT_PERMISSIONS.MANAGE.code])) {
        where.salesRep = ctx.role?._id;
    }

    return where;
};
// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

const set = async (model: any, entity: HydratedDocument<IProject>, ctx: RequestContext) => {
    // team — validated against platform tenant before being applied
    if (model.salesRep) {
        await assertPlatformStaff(model.salesRep, 'Sales rep', ctx);
        entity.salesRep = model.salesRep;
    }
    if (model.projectCoordinator) {
        await assertPlatformStaff(model.projectCoordinator, 'Project coordinator', ctx);
        entity.projectCoordinator = model.projectCoordinator;
    }
    // marketingContact is the CUSTOMER-side contact (a Contact record) — must belong to the
    // project's own tenant (the pharma company). entity.tenant is set before set() runs (derived from the lead).
    if (model.marketingContact) {
        const marketingContact = await ContactService.get(model.marketingContact, ctx, { populate: true });
        if (!marketingContact) {
            return throwAppError('Marketing contact not found', StatusCodes.NOT_FOUND);
        }
        if ((marketingContact.tenant as any)?._id?.toString() !== entity.tenant?.toString()) {
            return throwAppError('Marketing contact must belong to the selected company', StatusCodes.BAD_REQUEST);
        }
        entity.marketingContact = model.marketingContact;
    }

    // basics
    if (model.name) entity.name = model.name;
    if (model.therapy) entity.therapy = model.therapy;
    if (model.type) entity.type = model.type;
    if (model.tests) {
        await assertTestsExist(model.tests, ctx);
        entity.tests = model.tests;
    }

    // execution — `mode` is a nested sub-schema; InferSchemaType doesn't surface it, so cast
    if (model.mode) (entity as any).mode = model.mode;

    // financials
    if (model.campCost !== undefined) entity.campCost = model.campCost;
    if (model.totalCamps !== undefined) entity.totalCamps = model.totalCamps;
    if (model.gst !== undefined) entity.gst = model.gst;
    if (model.valueBeforeGST !== undefined) entity.valueBeforeGST = model.valueBeforeGST;
    if (model.additionalCost !== undefined) entity.additionalCost = model.additionalCost;

    // operations
    if (model.campTimeSlots) entity.campTimeSlots = model.campTimeSlots;
    if (model.freeCancelHours !== undefined) entity.freeCancelHours = model.freeCancelHours;
    if (model.cancellationAllowed !== undefined) entity.cancellationAllowed = model.cancellationAllowed;
    if (model.campCostDeductionOnChargableCancel !== undefined)
        entity.campCostDeductionOnChargableCancel = model.campCostDeductionOnChargableCancel;
    if (model.goLiveScope) entity.goLiveScope = model.goLiveScope;
    if (model.whoCanBookCamp) entity.whoCanBookCamp = model.whoCanBookCamp;

    // commercial
    if (model.paymentTerms) entity.paymentTerms = model.paymentTerms;

    // reports & review
    if (model.daysToBookBefore !== undefined) entity.daysToBookBefore = model.daysToBookBefore;
    if (model.effectiveEarliestSlot) entity.effectiveEarliestSlot = model.effectiveEarliestSlot;
    if (model.dietChart) entity.dietChart = model.dietChart;
    if (model.poRenewalReminder !== undefined) entity.poRenewalReminder = model.poRenewalReminder;
    if (model.clientReportCandance) entity.clientReportCandance = model.clientReportCandance;
    if (model.availablePointers) entity.availablePointers = model.availablePointers;
    if (model.tats !== undefined) entity.tats = model.tats;
    if (model.sops !== undefined) entity.sops = model.sops;

    return entity;
};

const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<ProjectDocument> => {
    const where: mongoose.QueryFilter<IProject> = ctx.where();

    if (isValidObjectID(id)) {
        where._id = id;
    } else {
        where.code = id;
    }

    applyOwnScope(where, ctx);

    let query = Project.findOne(where);

    if (options?.populate) {
        query = query.populate(populate);
    }

    return await query;
};

const search = async (filters: ISearchProjectQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { updatedAt: -1 };

    //1: add default scoping
    const where: mongoose.QueryFilter<IProject> = { ...ctx.where() };

    //2: add search filters
    // tenant filter (switch tenants) is only honoured for a `project:manage` actor that isn't already
    // tenant-pinned by ctx.where() — a customer actor stays locked to their own tenant regardless.
    if (filters.tenant && !where.tenant && ctx.hasAnyPermissions([PROJECT_PERMISSIONS.MANAGE.code])) {
        where.tenant = filters.tenant;
    }
    if (filters.name) {
        where.name = { $regex: filters.name, $options: 'i' };
    }
    if (filters.status) {
        where.status = filters.status;
    }
    if (filters.therapy) {
        where.therapy = filters.therapy;
    }
    if (filters.division) {
        where.division = filters.division;
    }
    if (filters.lead) {
        where.lead = filters.lead;
    }
    if (filters.salesRep) {
        where.salesRep = filters.salesRep;
    }

    //3: apply own-scope LAST so a filter can't widen past the actor's own visibility
    applyOwnScope(where, ctx);

    //4: execute queries
    const countPromise = Project.countDocuments(where);
    const dataPromise = Project.find(where).populate(populate).limit(options?.pagination?.limit).skip(options?.pagination?.skip).sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

const create = async (model: ICreateProjectPayload, ctx: RequestContext): Promise<HydratedDocument<IProject>> => {
    //1: source lead must exist (scoped to the actor); the project inherits its tenant + division
    const lead = await LeadService.get(model.lead, ctx);
    if (!lead) {
        return throwAppError('Lead not found', StatusCodes.NOT_FOUND);
    }

    //2: guard — one project per lead
    const existing = await Project.findOne({ ...ctx.where(), lead: lead._id });
    if (existing) {
        return throwAppError('A project already exists for this lead', StatusCodes.CONFLICT);
    }

    const project = await withTransaction(async () => {
        const code: string = await CounterService.next(PROJECT_COUNTER_ENTITY, ctx);
        //3: build entity — tenant + division are derived from the lead (source of truth),
        // never trusted from the payload.
        const entity = new Project({
            lead: lead._id,
            tenant: lead.tenant,
            division: lead.division,
            code,
        });

        //4: set validates + applies team and the remaining fields
        let project = await set(model, entity, ctx);
        project = await project.save();
        return project;
    });

    return project;
};

const update = async (id: string, model: IUpdateProjectPayload, ctx: RequestContext) => {
    //1: get project first (scoped)
    let project = await ProjectService.get(id, ctx);
    if (!project) {
        return throwAppError('Project not found', StatusCodes.NOT_FOUND);
    }

    //2: apply editable fields (lead/tenant/division/status are not touched here)
    project = await set(model, project, ctx);
    project = await project.save();

    return project;
};

// moveStage is the ONLY path allowed to change a project's status.
const moveStage = async (id: string, model: IMoveStagePayload, ctx: RequestContext) => {
    //1: get project first (scoped)
    let project = await ProjectService.get(id, ctx);
    if (!project) {
        return throwAppError('Project not found', StatusCodes.NOT_FOUND);
    }

    const from = project.status as string;
    const to = model.to;

    //2: guard — no-op move
    if (from === to) {
        return throwAppError(`Project is already in the '${to}' stage`, StatusCodes.BAD_REQUEST);
    }

    //3: guard — transition must be allowed
    if (!canTransition(PROJECT_TRANSITION_MAP, from, to)) {
        return throwAppError(`Invalid stage transition from '${from}' to '${to}'`, StatusCodes.BAD_REQUEST);
    }

    //4: append to the append-only journal + flip the cached status (one atomic save)
    // snapshot the actor's identity from the token so history stays true even if the user/role later changes
    const actorName = `${ctx.user?.firstName || ''} ${ctx.user?.lastName || ''}`.trim();
    project.stageHistory.push({
        from,
        to,
        reason: model.reason,
        actor: {
            roleId: ctx.role?._id || ctx.role?.id,
            name: actorName || undefined,
            email: ctx.user?.email,
        },
    } as any);
    project.status = to;
    project = await project.save();

    return project;
};

export const ProjectService = {
    get,
    search,
    create,
    update,
    moveStage,
};

// ========================================================================================
// EXPORTS
// ========================================================================================
