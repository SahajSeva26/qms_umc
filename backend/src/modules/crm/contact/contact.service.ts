import mongoose, { HydratedDocument } from 'mongoose';
import { IContact, ContactModel } from './contact.model';
import { ICreateContactPayload, ISearchContactQuery, IUpdateContactPayload } from './contact.validators';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../../shared/utils/strings';
import { IServiceOptions } from '../../../shared/types/service.types';
import { TENANT_TYPE } from '../../access-management/tenant/tenant.constants';

type ContactDocument = HydratedDocument<IContact> | null;

const populate: any[] = [
    { path: 'tenant', select: 'name code' },
    { path: 'user', select: 'firstName lastName email' },
];

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

// Contacts are created by internal (platform) roles, so the tenant comes from the payload.
// A customer user can only ever create within their own tenant, so we ignore whatever they
// send and pin it to their context tenant.
const resolveTenant = (model: ICreateContactPayload, ctx: RequestContext): string => {
    if (ctx.tenant?.type === TENANT_TYPE.CUSTOMER) {
        return (ctx.tenant?._id || ctx.tenant?.id)?.toString();
    }
    if (!model.tenant) {
        return throwAppError('Tenant is required', StatusCodes.BAD_REQUEST);
    }
    return model.tenant;
};

const set = (model: any, entity: HydratedDocument<IContact>) => {
    if (model.name) entity.name = model.name;
    if (model.designation !== undefined) entity.designation = model.designation;
    if (model.email !== undefined) entity.email = model.email;
    if (model.phone !== undefined) entity.phone = model.phone;
    if (model.location !== undefined) entity.location = model.location;
    if (model.type) entity.type = model.type;
    if (model.user !== undefined) entity.user = model.user;
    if (model.status) entity.status = model.status;
    return entity;
};

const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<ContactDocument> => {
    if (!isValidObjectID(id)) {
        return null;
    }

    const where: mongoose.QueryFilter<IContact> = { ...ctx.where(), _id: id };

    let query = ContactModel.findOne(where);

    if (options?.populate) {
        query = query.populate(populate);
    }

    return await query;
};

const search = async (filters: ISearchContactQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { updatedAt: -1 };

    //1: default scoping — platform sees all, customer pinned to own tenant (ctx.where)
    const where: mongoose.QueryFilter<IContact> = { ...ctx.where() };

    //2: platform staff may narrow to a specific tenant's contacts; the filter is
    // ignored for customer users so they can never read another tenant's people.
    if (filters.tenant && ctx.tenant?.type === TENANT_TYPE.PLATFORM) {
        where.tenant = filters.tenant;
    }

    //3: search filters
    if (filters.name) {
        where.name = { $regex: filters.name, $options: 'i' };
    }
    if (filters.type) {
        where.type = filters.type;
    }
    if (filters.status) {
        where.status = filters.status;
    }

    //4: execute
    const countPromise = ContactModel.countDocuments(where);
    const dataPromise = ContactModel.find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

const create = async (model: ICreateContactPayload, ctx: RequestContext): Promise<HydratedDocument<IContact>> => {
    //1: resolve the owning tenant (explicit for platform, own-tenant for customer)
    const tenant = resolveTenant(model, ctx);

    //2: duplicate-email guard within the tenant (email is optional)
    if (model.email) {
        const existing = await ContactModel.findOne({ tenant, email: model.email });
        if (existing) {
            return throwAppError('A contact with this email already exists for this company', StatusCodes.CONFLICT);
        }
    }

    //3: build + apply
    const entity = new ContactModel({ tenant });
    let contact = set(model, entity);
    contact = await contact.save();

    return contact;
};

const update = async (id: string, model: IUpdateContactPayload, ctx: RequestContext) => {
    //1: get contact first (scoped)
    let contact = await ContactService.get(id, ctx);
    if (!contact) {
        return throwAppError('Contact not found', StatusCodes.NOT_FOUND);
    }

    //2: apply editable fields (tenant is never touched here)
    contact = set(model, contact);
    contact = await contact.save();

    return contact;
};

export const ContactService = {
    get,
    search,
    create,
    update,
};

// ========================================================================================
// EXPORTS
// ========================================================================================
