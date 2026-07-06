import mongoose, { HydratedDocument } from 'mongoose';
import { ITenant, TenantModel } from './tenant.model';
import { ICreateTenantPayload, ISearchTenantQuery, IUpdateTenantPayload } from './tenant.validators';
import { TENANT_STATUS } from './tenant.constants';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { toObjectId, isValidObjectID } from '../../../shared/utils/strings';

type TenantDocument = HydratedDocument<ITenant> | null;
const populate: any[] = [];
// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

const set = async (model: any, entity: HydratedDocument<ITenant>, ctx: RequestContext) => {
    if (model.code) {
        entity.code = model.code;
    }
    if (model.name) {
        entity.name = model.name;
    }
    if (model.owner) {
        // TODO: validate owner exists
        entity.owner = toObjectId(model.owner);
    }
    if (model.status) {
        entity.status = model.status;
    }

    return entity;
};

const get = async (id: string, ctx: RequestContext, options?: any): Promise<TenantDocument> => {
    let query = null;

    if (isValidObjectID(id)) {
        query = TenantModel.findOne({ _id: id });
    } else {
        query = TenantModel.findOne({ code: id });
    }

    if (query) {
        if (options) {
            query = query.populate(options);
        }
    }

    return await query;
};

const search = async (filters: ISearchTenantQuery, ctx: RequestContext, options?: any) => {
    let sort: any = {
        createdAt: -1,
    };

    let where: mongoose.QueryFilter<ITenant> = {
        // add context default where build here
    };

    if (filters.name) {
        where.name = { $regex: filters.name, $options: 'i' };
    }
    if (filters.code) {
        where.code = { $regex: filters.code, $options: 'i' };
    }
    if (filters.status) {
        where.status = filters.status;
    }

    const countPromise = TenantModel.countDocuments(where);

    const dataPromise = TenantModel.find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return {
        count,
        items,
    };
};

const create = async (model: ICreateTenantPayload, ctx: RequestContext): Promise<HydratedDocument<ITenant>> => {
    let tenant: TenantDocument = null;

    //1: check existing tenant
    tenant = await TenantService.get(model.code, ctx);
    if (tenant) {
        return throwAppError('Tenant with this code already exists', StatusCodes.CONFLICT);
    }

    //2: create tenant
    const entity = new TenantModel({
        // code: model.code,
        // status: TENANT_STATUS.ACTIVE,
    });

    //3: set remaining fields
    tenant = await set(model, entity, ctx);

    tenant = await tenant.save();
    return tenant;
};

const update = async (id: string, model: IUpdateTenantPayload, ctx: RequestContext) => {
    //1: get tenant first
    let tenant: TenantDocument = null;
    tenant = await TenantService.get(id, ctx);
    if (!tenant) {
        return throwAppError('Tenant not found', StatusCodes.NOT_FOUND);
    }

    //2: update tenant
    tenant = await set(model, tenant, ctx);
    tenant = await tenant.save();

    //3: return tenant
    return tenant;
};

export const TenantService = {
    get,
    search,
    create,
    update,
};

// ========================================================================================
// EXPORTS
// ========================================================================================
