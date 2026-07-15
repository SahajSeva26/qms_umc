import mongoose, { HydratedDocument } from 'mongoose';
import { ILead, LeadModel } from './lead.model';
import {
    ICreateLeadPayload,
    IMoveStagePayload,
    ISearchLeadQuery,
    IUpdateLeadPayload,
} from './lead.validators';
import { LEAD_TRANSITION_MAP } from './lead.constants';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../../shared/utils/strings';
import { IServiceOptions } from '../../../shared/types/service.types';
import { DivisionService } from '../../division/division.service';

type LeadDocument = HydratedDocument<ILead> | null;

const populate: any[] = [
    { path: 'tenant', select: 'name code' },
    { path: 'division', select: 'name code therapy' },
    { path: 'contactPerson' },
    { path: 'salesPerson' },
];

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

const set = async (model: any, entity: HydratedDocument<ILead>, ctx: RequestContext) => {
    if (model.contactPerson) entity.contactPerson = model.contactPerson;
    if (model.salesPerson) entity.salesPerson = model.salesPerson;
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
    if (!isValidObjectID(id)) {
        return null;
    }

    const where: mongoose.QueryFilter<ILead> = { ...ctx.where(), _id: id };
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

    //3: execute queries
    const countPromise = LeadModel.countDocuments(where);
    const dataPromise = LeadModel.find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

const create = async (model: ICreateLeadPayload, ctx: RequestContext): Promise<HydratedDocument<ILead>> => {
    //1: division must exist within the actor's scope; the lead inherits its tenant
    const division = await DivisionService.get(model.division, ctx);
    if (!division) {
        return throwAppError('Division not found', StatusCodes.NOT_FOUND);
    }

    //2: build entity — tenant is derived from the division (the pharma company)
    const entity = new LeadModel({
        tenant: division.tenant,
        division: division._id,
    });

    //3: set remaining fields
    let lead = await set(model, entity, ctx);
    lead = await lead.save();

    return lead;
};

const update = async (id: string, model: IUpdateLeadPayload, ctx: RequestContext) => {
    //1: get lead first (scoped)
    let lead = await LeadService.get(id, ctx);
    if (!lead) {
        return throwAppError('Lead not found', StatusCodes.NOT_FOUND);
    }

    //2: apply editable fields (status/division/tenant are not touched here)
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
    const allowed = LEAD_TRANSITION_MAP[from] || [];
    if (!allowed.includes(to)) {
        return throwAppError(`Invalid stage transition from '${from}' to '${to}'`, StatusCodes.BAD_REQUEST);
    }

    //4: append to the append-only journal + flip the cached status (one atomic save)
    lead.stageHistory.push({
        from,
        to,
        reason: model.reason,
        createdBy: ctx.role?._id || ctx.role?.id,
    } as any);
    lead.status = to;
    lead = await lead.save();

    return lead;
};

export const LeadService = {
    get,
    search,
    create,
    update,
    moveStage,
};

// ========================================================================================
// EXPORTS
// ========================================================================================
