// Test Service
import mongoose, { HydratedDocument } from 'mongoose';
import { TestModel, TestDocument as ITest } from './test.model';
import { TestDoc } from './test.types';
import { ICreateTestPayload, ISearchTestQuery, IUpdateTestPayload } from './test.validators';
import { TEST_PERMISSIONS } from './test.constants';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { IServiceOptions } from '../../../shared/types/service.types';
import { ScreeningService } from '../screening/screening.service';
import { SCREENING_STATUS } from '../screening/screening.constants';
import { CampService } from '../camp/camp.service';
import { CAMP_STATUSES } from '../camp/camp.constants';
import { TestMasterService } from '../testMaster/testMaster.service';
import { withTransaction } from '../../../shared/helpers/transactionHelper';
import { InventoryAssignmentService } from '../../inventory/inventory-assignment/inventory-assignment.service';
import { INVENTORY_ASSIGNMENT_TYPES } from '../../inventory/inventory-assignment/inventory-assignment.constants';
import { InventoryAssignmentModel } from '../../inventory/inventory-assignment/inventory-assignment.model';
import { InventoryConsumableModel } from '../../inventory/inventory-consumable/inventory-consumable.model';

const populate: any[] = [
    { path: 'tenant', select: 'name code' },
    { path: 'screening', select: 'status patient camp' },
    { path: 'type', select: 'code name therapy' },
    { path: 'performedBy', select: 'name code' },
];

// camp states past which no more tests may be recorded — the camp is over.
const TERMINAL_CAMP_STATUSES: string[] = [
    CAMP_STATUSES.CLOSED,
    CAMP_STATUSES.CANCELLED,
    CAMP_STATUSES.CANCELLED_CHARGED,
];

// ================================ HELPERS ================================

// A non-manage actor may only record/mutate a test for a camp they are the assigned worker of
// (diet → dietitian, else FO, via CampService.workerFor); manage actors bypass this.
const assertAssignedWorkerOrManage = (camp: any, ctx: RequestContext) => {
    if (ctx.hasAnyPermissions([TEST_PERMISSIONS.MANAGE.code])) {
        return;
    }
    const worker = CampService.workerFor(camp?.type);
    const isWorkerType = ctx.role?.type?.code === worker.roleTypeCode;
    // assignee may be a populated doc or a raw ObjectId — normalise to an id before comparing
    const assignee = camp?.[worker.field];
    const assigneeId = assignee?._id ?? assignee;
    const isAssigned = assigneeId && ctx.role?._id && assigneeId.toString() === ctx.role._id.toString();
    if (!isWorkerType || !isAssigned) {
        return throwAppError(`Only the ${worker.label} assigned to this camp can record its patients' tests`, StatusCodes.FORBIDDEN);
    }
};

// Load the test's screening + its (worker-populated) camp and authorize the actor as the assigned
// worker (or manage). Returns both so the caller can bill the assigned worker's stock.
const loadScreeningForAction = async (screeningId: any, ctx: RequestContext) => {
    const screening: any = await ScreeningService.get(screeningId.toString(), ctx, { populate: true });
    if (!screening) {
        return throwAppError('Screening not found', StatusCodes.NOT_FOUND);
    }

    const campRef = screening.camp?._id ?? screening.camp;
    const camp = await CampService.get(campRef.toString(), ctx, { populate: true });
    if (!camp) {
        return throwAppError('Camp not found', StatusCodes.NOT_FOUND);
    }
    assertAssignedWorkerOrManage(camp, ctx);

    return { screening, camp };
};

// Subtract each consumption line's `rate` from what the assigned worker (FO or dietitian) holds of
// that catalog item. Throws 409 (rolling back the create txn) if short. Runs inside the create txn.
const reduceWorkerStock = async (workerId: any, consumption: any[], ctx: RequestContext) => {
    if (!workerId || !consumption?.length) {
        return;
    }
    for (const line of consumption) {
        const rate = line.rate ?? 1;
        // devices carry rate 0 (reusable, not depleted) — nothing to subtract
        if (rate <= 0) {
            continue;
        }
        await reduceWorkerHoldingForItem(workerId, line.item, rate, ctx);
    }
};

// A consumption line's `item` is a catalog item (InventoryMaster); the worker holds it as lots
// (InventoryConsumable). Bridge item → the worker's lots, then subtract `rate` across them (409 if short).
const reduceWorkerHoldingForItem = async (workerId: any, item: any, rate: number, ctx: RequestContext) => {
    //1: the catalog item's lots — the bridge from the master to what the worker can actually hold
    const lots = await InventoryConsumableModel.find({ item }).select('_id');
    const lotIds = lots.map((lot) => lot._id);

    //2: what the worker actually holds of those lots
    const holdings = await InventoryAssignmentModel.find({
        assignee: workerId,
        inventoryType: INVENTORY_ASSIGNMENT_TYPES.CONSUMABLE,
        inventory: { $in: lotIds },
    });

    //3: block up-front if the worker can't cover the required rate across all their lots of this item
    const totalHeld = holdings.reduce((sum, row) => sum + row.quantity, 0);
    if (totalHeld < rate) {
        return throwAppError('The assigned worker does not hold enough stock to record this test', StatusCodes.CONFLICT);
    }

    //4: subtract lot by lot until the rate is covered
    let remaining = rate;
    for (const row of holdings) {
        if (remaining <= 0) {
            break;
        }
        const take = Math.min(row.quantity, remaining);
        await InventoryAssignmentService.adjustHolding(
            workerId.toString(),
            INVENTORY_ASSIGNMENT_TYPES.CONSUMABLE,
            row.inventory.toString(),
            -take,
            ctx,
        );
        remaining -= take;
    }
};

// non-manage actor sees only the tests they performed; manage sees all
const applyOwnScope = (where: any, ctx: RequestContext) => {
    if (!ctx.hasAnyPermissions([TEST_PERMISSIONS.MANAGE.code])) {
        where.performedBy = ctx.role?._id;
    }
};

// ================================ CORE FUNCTIONS ================================

// only the result is editable through set(); screening/type/tenant/performedBy are pinned at create.
const set = async (model: any, entity: HydratedDocument<ITest>, ctx: RequestContext) => {
    if (model.result !== undefined) {
        entity.result = model.result;
    }
    return entity;
};

const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<TestDoc> => {
    const where: mongoose.QueryFilter<ITest> = ctx.where();
    where._id = id;
    applyOwnScope(where, ctx);

    let query = TestModel.findOne(where);
    if (options?.populate) {
        query = query.populate(populate);
    }

    return await query;
};

const search = async (filters: ISearchTestQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { createdAt: -1 };

    const where: mongoose.QueryFilter<ITest> = { ...ctx.where() };
    // own-scope up-front — a non-manage actor is pinned to their own tests. Safe here (not at the
    // end) because the only actor-widening filter below (tenant) is itself manage-gated.
    applyOwnScope(where, ctx);

    // tenant filter (switch tenants) is only honoured for a test:manage actor not already
    // tenant-pinned by ctx.where() — a scoped actor stays locked to their own tenant.
    if (filters.tenant && !where.tenant && ctx.hasAnyPermissions([TEST_PERMISSIONS.MANAGE.code])) {
        where.tenant = filters.tenant;
    }
    if (filters.screening) {
        where.screening = filters.screening;
    }
    if (filters.type) {
        where.type = filters.type;
    }

    const countPromise = TestModel.countDocuments(where);
    const dataPromise = TestModel.find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

const create = async (model: ICreateTestPayload, ctx: RequestContext): Promise<HydratedDocument<ITest>> => {
    //1: load the screening (scope) + camp, authorize the actor as the assigned worker (or manage)
    const { screening, camp } = await loadScreeningForAction(model.screening, ctx);

    //2: no tests once the camp is closed/cancelled
    if (TERMINAL_CAMP_STATUSES.includes(camp.status)) {
        return throwAppError('Tests cannot be recorded once the camp is closed', StatusCodes.CONFLICT);
    }

    //3: tests are performed only after the screening is completed
    if (screening.status !== SCREENING_STATUS.COMPLETED) {
        return throwAppError('Tests can only be recorded once the screening is completed', StatusCodes.CONFLICT);
    }

    //4: the catalog test (TestMaster) must exist
    const testMaster = await TestMasterService.get(model.type, ctx);
    if (!testMaster) {
        return throwAppError('Test master not found', StatusCodes.NOT_FOUND);
    }

    //5: the catalog test must belong to this camp's type
    if (testMaster.campType !== camp.type) {
        return throwAppError(
            `This test belongs to a ${testMaster.campType} camp and cannot be recorded in a ${camp.type} camp`,
            StatusCodes.CONFLICT,
        );
    }

    //6: one result per catalog test per screening — search runs before the txn (count+find in
    // parallel, forbidden inside a transaction)
    const { count } = await TestService.search(
        { screening: screening._id.toString(), type: testMaster._id.toString() },
        ctx,
    );
    if (count > 0) {
        return throwAppError('This test has already been recorded for this screening', StatusCodes.CONFLICT);
    }

    //7: build entity — tenant from screening, performedBy = the acting role
    const entity = new TestModel({
        tenant: screening.tenant?._id ?? screening.tenant,
        screening: screening._id,
        type: testMaster._id,
        performedBy: ctx.role?._id,
    });

    //8: save the test + reduce the assigned worker's stock atomically (short stock → 409 + rollback)
    const worker = CampService.workerFor(camp.type);
    const assignee = camp[worker.field];
    const workerId = assignee?._id ?? assignee;
    return await withTransaction(async () => {
        let test = await set(model, entity, ctx);
        test = await test.save();

        await reduceWorkerStock(workerId, testMaster.consumption as any[], ctx);

        return test;
    });
};

const update = async (id: string, model: IUpdateTestPayload, ctx: RequestContext) => {
    // get() already own-scopes to performedBy for a non-manage actor, so they can only mutate a test
    // they recorded — no extra assigned-worker check needed.
    let entity = await TestService.get(id, ctx);
    if (!entity) {
        return throwAppError('Test not found', StatusCodes.NOT_FOUND);
    }

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
