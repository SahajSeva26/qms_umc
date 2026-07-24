// Counter Service
import { HydratedDocument } from 'mongoose';
import { CounterModel, ICounter } from './counter.model';
import { ICreateCounterPayload, ISearchCounterQuery, IUpdateCounterPayload } from './counter.validators';
import { COUNTER_PERMISSIONS, COUNTER_STATUSES } from './counter.constants';
import { throwAppError } from '../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../shared/utils/strings';
import { IServiceOptions } from '../../shared/types/service.types';

type CounterDocument = HydratedDocument<ICounter> | null;

// Counter is a global/system record — it belongs to no tenant, so there is no
// ctx.where() scoping and no populate chain (it holds no references).
//
// NOTE: this module is CRUD only. currentValue is settable through create/update so
// other services can drive the running sequence. Note that update() is read-then-save
// (not atomic) — for concurrent increments, call findOneAndUpdate + $inc directly at
// the call site rather than going through update().

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

// entity is the immutable natural key — it is seeded at construction in create()
// and never handled here, so update() can never reassign it. currentValue IS settable
// so other services can drive the running sequence through update().
const set = async (model: any, entity: HydratedDocument<ICounter>, ctx: RequestContext) => {
    if (model.prefix) entity.prefix = model.prefix;
    if (model.suffix !== undefined) entity.suffix = model.suffix;
    if (model.separator !== undefined) entity.separator = model.separator;
    if (model.padding !== undefined) entity.padding = model.padding;
    if (model.format) entity.format = model.format;
    if (model.currentValue !== undefined) entity.currentValue = model.currentValue;
    if (model.status) entity.status = model.status;
    if (model.description !== undefined) entity.description = model.description;

    return entity;
};

// get accepts either an ObjectId or the counter's entity (natural key).
const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<CounterDocument> => {
    const where: any = isValidObjectID(id) ? { _id: id } : { entity: id.toLowerCase() };

    return await CounterModel.findOne(where);
};

const search = async (filters: ISearchCounterQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { entity: 1 };

    //1: default visibility — only active counters are visible (no tenant scoping, counter is global)
    const where: any = {};
    where.status = COUNTER_STATUSES.ACTIVE;

    //2: add search filters
    if (filters.entity) {
        where.entity = filters.entity.toLowerCase();
    }
    if (filters.prefix) {
        where.prefix = { $regex: filters.prefix, $options: 'i' };
    }
    // only a manage-level actor may look past active (see inactive counters)
    if (filters.status && ctx.hasAnyPermissions([COUNTER_PERMISSIONS.MANAGE.code])) {
        where.status = filters.status;
    }

    //3: execute count + data together
    const countPromise = CounterModel.countDocuments(where);
    const dataPromise = CounterModel.find(where)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

const create = async (model: ICreateCounterPayload, ctx: RequestContext): Promise<HydratedDocument<ICounter>> => {
    //1: guard — entity must be free (reuse get on the natural key)
    const existing = await CounterService.get(model.entity, ctx);
    if (existing) {
        return throwAppError('A counter for this entity already exists', StatusCodes.CONFLICT);
    }

    //2: build entity — entity (immutable natural key) is seeded here; everything else,
    //   including the optional starting currentValue, flows through set()
    const counter = new CounterModel({ entity: model.entity });
    let saved = await set(model, counter, ctx);
    saved = await saved.save();

    return saved;
};

const update = async (id: string, model: IUpdateCounterPayload, ctx: RequestContext) => {
    //1: get first
    let counter = await CounterService.get(id, ctx);
    if (!counter) {
        return throwAppError('Counter not found', StatusCodes.NOT_FOUND);
    }

    //2: apply editable fields (entity is omitted — set() ignores it)
    counter = await set(model, counter, ctx);
    counter = await counter.save();

    return counter;
};

export const CounterService = {
    get,
    search,
    create,
    update,
};
