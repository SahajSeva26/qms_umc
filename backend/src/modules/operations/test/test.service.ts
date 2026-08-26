// Test Service
import { HydratedDocument } from 'mongoose';
import { TestModel, ITest } from './test.model';
import { ICreateTestPayload, ISearchTestQuery, IUpdateTestPayload } from './test.validators';
import { TEST_PERMISSIONS, TEST_STATUS } from './test.constants';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../../shared/utils/strings';
import { IServiceOptions } from '../../../shared/types/service.types';
import { InventoryMasterService } from '../../inventory/inventory-master/inventory-master.service';
import { ITEM_TYPES } from '../../inventory/inventory-master/inventory-master.constants';

type TestDocument = HydratedDocument<ITest> | null;

// A device is reusable equipment — it is not depleted per test, so its consumption rate
// defaults to 0. Resolve each line's catalog item; every referenced item must exist (a bad
// id rejects the whole create/update). When the item is a device and no rate is explicitly
// supplied, set the rate to 0 (consumables keep their supplied/default rate).
const normalizeConsumption = async (lines: any[], ctx: RequestContext) => {
    const normalized: any[] = [];
    for (const line of lines) {
        const item = await InventoryMasterService.get(String(line.item), ctx);
        if (!item) {
            return throwAppError(`Inventory item not found: ${line.item}`, StatusCodes.BAD_REQUEST);
        }
        if (item.type === ITEM_TYPES.DEVICE && line.rate === undefined) {
            normalized.push({ ...line, rate: 0 });
        } else {
            normalized.push(line);
        }
    }
    return normalized;
};

// Test is a global/system catalog record — it belongs to no tenant, so there is
// no ctx.where() scoping. It only references InventoryMaster (via consumption lines).
const populate: any[] = [{ path: 'consumption.item' }];

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

// code is the immutable natural key — it is seeded at construction in create()
// and never handled here, so update() can never reassign it.
const set = async (model: any, entity: HydratedDocument<ITest>, ctx: RequestContext) => {
    if (model.name) {
        entity.name = model.name;
    }
    if (model.description) {
        entity.description = model.description;
    }
    if (model.therapy) {
        entity.therapy = model.therapy;
    }
    if (model.config !== undefined) {
        entity.config = model.config;
    }
    if (model.consumption !== undefined) {
        entity.consumption = (await normalizeConsumption(model.consumption, ctx)) as any;
    }
    if (model.status && ctx.hasAnyPermissions([TEST_PERMISSIONS.MANAGE.code])) {
        entity.status = model.status;
    }

    return entity;
};

// get accepts either an ObjectId or the test's code (natural key).
const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<TestDocument> => {
    const where: any = isValidObjectID(id) ? { _id: id } : { code: id };

    const query = TestModel.findOne(where);
    if (options?.populate) {
        query.populate(populate);
    }

    return await query;
};

const search = async (filters: ISearchTestQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { name: 1 };

    //1: default visibility — only active tests are visible (no tenant scoping, catalog is global)
    const where: any = {};
    where.status = TEST_STATUS.ACTIVE;

    //2: add search filters
    if (filters.name) {
        where.name = { $regex: filters.name, $options: 'i' };
    }
    if (filters.code) {
        where.code = { $regex: filters.code, $options: 'i' };
    }
    if (filters.therapy) {
        // accept a single therapy or a list of therapies (→ $in) so a caller can show every test
        // belonging to a group of therapies in one query.
        where.therapy = Array.isArray(filters.therapy) ? { $in: filters.therapy } : filters.therapy;
    }
    // only a manage-level actor may look past active (see inactive tests)
    if (filters.status && ctx.hasAnyPermissions([TEST_PERMISSIONS.MANAGE.code])) {
        where.status = filters.status;
    }

    //3: execute count + data together
    const countPromise = TestModel.countDocuments(where);
    const dataPromise = TestModel.find(where).limit(options?.pagination?.limit).skip(options?.pagination?.skip).sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

const create = async (model: ICreateTestPayload, ctx: RequestContext): Promise<HydratedDocument<ITest>> => {
    //1: guard — code must be free (reuse get on the natural key)
    const existing = await TestService.get(model.code, ctx);
    if (existing) {
        return throwAppError('A test with this code already exists', StatusCodes.CONFLICT);
    }

    //2: build entity — code (immutable natural key) is seeded here, never in set()
    let entity = new TestModel({ code: model.code });
    entity = await set(model, entity, ctx);
    entity = await entity.save();

    return entity;
};

const update = async (id: string, model: IUpdateTestPayload, ctx: RequestContext) => {
    //1: get first
    let entity = await TestService.get(id, ctx);
    if (!entity) {
        return throwAppError('Test not found', StatusCodes.NOT_FOUND);
    }

    //2: apply editable fields (code is immutable — set() ignores it on an existing doc)
    entity = await set(model, entity, ctx);
    entity = await entity.save();

    return entity;
};

export const TestService = {
    get,
    search,
    create,
    update,
};
