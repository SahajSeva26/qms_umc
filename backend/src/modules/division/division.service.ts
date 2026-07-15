import mongoose, { HydratedDocument } from 'mongoose';
import { IDivision, DivisionModel } from './division.model';
import { ICreateDivisionPayload, ISearchDivisionQuery, IUpdateDivisionPayload } from './division.validators';
import { DIVISION_PERMISSIONS, DIVISION_STATUS } from './division.constants';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../../shared/utils/strings';
import { IServiceOptions } from '../../../shared/types/service.types';
import { TENANT_PERMISSIONS, TENANT_TYPE } from '../../access-management/tenant/tenant.constants';

type DivisionDocument = HydratedDocument<IDivision> | null;
const populate: any[] = [
    {
        path: 'tenant',
        select: 'name code',
    },
];

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

const set = async (model: any, entity: HydratedDocument<IDivision>, ctx: RequestContext) => {
    if (model.name) {
        entity.name = model.name;
    }
    if (model.therapy) {
        entity.therapy = model.therapy;
    }
    if (model.brandFocus !== undefined) {
        entity.brandFocus = model.brandFocus;
    }
    if (model.mrCount !== undefined) {
        entity.mrCount = model.mrCount;
    }
    if (model.status) {
        entity.status = model.status;
    }

    return entity;
};

const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<DivisionDocument> => {
    let query = null;
    let where: mongoose.QueryFilter<IDivision> = { ...ctx.where() };

    if (isValidObjectID(id)) {
        where._id = id;
        query = DivisionModel.findOne(where);
    } else {
        where.code = id;
        query = DivisionModel.findOne(where);
    }

    if (options?.populate) {
        query = query.populate(populate);
    }

    return await query;
};

const search = async (filters: ISearchDivisionQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { createdAt: -1 };

    //1: add default scoping
    const where: mongoose.QueryFilter<IDivision> = { ...ctx.where() };
    where.status = DIVISION_STATUS.ACTIVE;

    //2: add search filters
    if (filters.name) {
        where.name = { $regex: filters.name, $options: 'i' };
    }
    if (filters.code) {
        where.code = { $regex: filters.code, $options: 'i' };
    }
    if (filters.therapy) {
        where.therapy = filters.therapy;
    }
    if (filters.status && ctx.hasAnyPermissions([DIVISION_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.ADMIN.code])) {
        where.status = filters.status;
    }

    //3: execute queries
    const countPromise = DivisionModel.countDocuments(where);
    const dataPromise = DivisionModel.find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

const create = async (model: ICreateDivisionPayload, ctx: RequestContext): Promise<HydratedDocument<IDivision>> => {
    let division: DivisionDocument = null;

    //0: platform tenant cannot own/create divisions
    if (ctx.tenant.type === TENANT_TYPE.PLATFORM) {
        return throwAppError('Platform tenant cannot create divisions', StatusCodes.FORBIDDEN);
    }

    //1: check for duplicate code (within the actor's scope)
    division = await DivisionService.get(model.code, ctx);
    if (division) {
        return throwAppError('Division with this code already exists', StatusCodes.CONFLICT);
    }

    //2: create division under the actor's tenant (customer)
    const entity = new DivisionModel({
        code: model.code, //immutable
        tenant: ctx.tenant._id || ctx.tenant.id,
    });

    //3: set remaining fields
    division = await set(model, entity, ctx);
    division = await division.save();

    return division;
};

const update = async (id: string, model: IUpdateDivisionPayload, ctx: RequestContext) => {
    //1: get division first
    let division: DivisionDocument = null;
    division = await DivisionService.get(id, ctx);
    if (!division) {
        return throwAppError('Division not found', StatusCodes.NOT_FOUND);
    }

    //2: update division
    division = await set(model, division, ctx);
    division = await division.save();

    //3: return division
    return division;
};

export const DivisionService = {
    get,
    search,
    create,
    update,
};

// ========================================================================================
// EXPORTS
// ========================================================================================
