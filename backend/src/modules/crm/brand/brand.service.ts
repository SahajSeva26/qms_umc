import mongoose, { HydratedDocument } from 'mongoose';
import { IBrand, BrandModel } from './brand.model';
import { ICreateBrandPayload, ISearchBrandQuery, IUpdateBrandPayload } from './brand.validators';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../../shared/utils/strings';
import { IServiceOptions } from '../../../shared/types/service.types';
import { TENANT_TYPE } from '../../access-management/tenant/tenant.constants';
import { DivisionService } from '../division/division.service';

type BrandDocument = HydratedDocument<IBrand> | null;

const populate: any[] = [
    { path: 'tenant', select: 'name code' },
    { path: 'division', select: 'name code therapy' },
];

// derive the natural key from the name: lowercase + strip ALL whitespace (e.g. 'Cardace Plus' → 'cardaceplus')
const toCode = (name: string): string => name.toLowerCase().replace(/\s+/g, '');

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

const set = (model: any, entity: HydratedDocument<IBrand>) => {
    // code is NOT set here — it is derived once at create and is immutable thereafter
    if (model.name) entity.name = model.name;
    if (model.description !== undefined) entity.description = model.description;
    if (model.molecule !== undefined) entity.molecule = model.molecule;
    if (model.notes !== undefined) entity.notes = model.notes;
    if (model.color !== undefined) entity.color = model.color;
    if (model.status) entity.status = model.status;
    return entity;
};

const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<BrandDocument> => {
    if (!isValidObjectID(id)) {
        return null;
    }

    const where: mongoose.QueryFilter<IBrand> = { ...ctx.where(), _id: id };

    let query = BrandModel.findOne(where);

    if (options?.populate) {
        query = query.populate(populate);
    }

    return await query;
};

const search = async (filters: ISearchBrandQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { updatedAt: -1 };

    //1: default scoping — platform sees all, customer pinned to own tenant (ctx.where)
    const where: mongoose.QueryFilter<IBrand> = { ...ctx.where() };

    //2: platform staff may narrow to a specific tenant's brands; the filter is ignored for
    // customer users so they can never read another tenant's brands.
    if (filters.tenant && ctx.tenant?.type === TENANT_TYPE.PLATFORM) {
        where.tenant = filters.tenant;
    }

    //3: search filters
    if (filters.division) {
        where.division = filters.division;
    }
    if (filters.code) {
        where.code = filters.code;
    }
    if (filters.name) {
        where.name = { $regex: filters.name, $options: 'i' };
    }
    if (filters.status) {
        where.status = filters.status;
    }

    //4: execute
    const countPromise = BrandModel.countDocuments(where);
    const dataPromise = BrandModel.find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

const create = async (model: ICreateBrandPayload, ctx: RequestContext): Promise<HydratedDocument<IBrand>> => {
    //1: the division must exist (scoped to the actor). The brand inherits its tenant — a customer
    // user can only ever resolve their own division, so the tenant is implicitly their own.
    const division = await DivisionService.get(model.division, ctx);
    if (!division) {
        return throwAppError('Division not found', StatusCodes.NOT_FOUND);
    }

    //2: tenant is derived from the division (the pharma company, source of truth) — never trusted
    // from the caller.
    const tenant = division.tenant;

    //3: derive the immutable natural key from the name (lowercase + all whitespace stripped)
    const code = toCode(model.name);

    //4: duplicate guard within the division — keyed on the derived code (create() always checks
    // for an existing record first). Reuses search(); the unique {tenant,division,code} index is
    // the race backstop.
    const { count } = await BrandService.search({ division: division._id.toString(), code }, ctx);
    if (count > 0) {
        return throwAppError('A brand with this name already exists in this division', StatusCodes.CONFLICT);
    }

    //5: build + apply — code is set here once and never touched again
    const entity = new BrandModel({ tenant, division: division._id, code });
    let brand = set(model, entity);
    brand = await brand.save();

    return brand;
};

const update = async (id: string, model: IUpdateBrandPayload, ctx: RequestContext) => {
    //1: get brand first (scoped)
    let brand = await BrandService.get(id, ctx);
    if (!brand) {
        return throwAppError('Brand not found', StatusCodes.NOT_FOUND);
    }

    //2: apply editable fields (tenant/division are never touched here)
    brand = set(model, brand);
    brand = await brand.save();

    return brand;
};

export const BrandService = {
    get,
    search,
    create,
    update,
};

// ========================================================================================
// EXPORTS
// ========================================================================================
