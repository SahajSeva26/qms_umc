// Counter Service
import { HydratedDocument } from 'mongoose';
import { CounterModel, ICounter } from './counter.model';
import { ISearchCounterQuery, IUpdateCounterPayload } from './counter.validators';
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
    const dataPromise = CounterModel.find(where).limit(options?.pagination?.limit).skip(options?.pagination?.skip).sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

// Render a counter document into its formatted code string, honoring the stored
// format template tokens: {{prefix}} {{suffix}} {{separator}} {{number}}. prefix/suffix
// are stored lowercase but codes read as uppercase (LEAD-000001), so they're upper-cased here.
const formatCode = (counter: HydratedDocument<ICounter>): string => {
    const number = String(counter.currentValue).padStart(counter.padding, '0');
    return counter.format
        .replace(/{{\s*prefix\s*}}/g, counter.prefix || '')
        .replace(/{{\s*suffix\s*}}/g, counter.suffix || '')
        .replace(/{{\s*separator\s*}}/g, counter.separator || '')
        .replace(/{{\s*number\s*}}/g, number)
        .trim();
};

// Atomically reserve the next value for `entity` and return its formatted code.
// A single-document $inc is atomic on its own, so concurrent callers each get a distinct
// value with no race. When called inside a transaction it auto-joins the session
// (transactionAsyncLocalStorage) — so if the caller's transaction aborts, the increment
// rolls back and the code is never burned (no gaps in the sequence).
const next = async (entity: string, ctx: RequestContext): Promise<string> => {
    const counter = await CounterModel.findOneAndUpdate(
        { entity: entity.toLowerCase(), status: COUNTER_STATUSES.ACTIVE },
        { $inc: { currentValue: 1 } },
        { new: true },
    );
    if (!counter) {
        return throwAppError(`No active counter found for "${entity}"`, StatusCodes.INTERNAL_SERVER_ERROR);
    }
    return formatCode(counter);
    // return counter.currentValue;
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
    next,
    update,
};
