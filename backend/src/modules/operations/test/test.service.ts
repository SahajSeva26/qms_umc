// Test Service
import mongoose, { HydratedDocument } from 'mongoose';
import { TestModel, TestDocument as ITest } from './test.model';
import { ICreateTestPayload, ISearchTestQuery, IUpdateTestPayload } from './test.validators';
import { TEST_PERMISSIONS } from './test.constants';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { IServiceOptions } from '../../../shared/types/service.types';
import { ScreeningService } from '../screening/screening.service';
import { SCREENING_STATUS } from '../screening/screening.constants';
import { CampService } from '../camp/camp.service';
import { TestMasterService } from '../testMaster/testMaster.service';
import { ALLOWED_ROLETYPE_CODES } from '../../access-management/role-type/roleType.constants';

type TestDoc = HydratedDocument<ITest> | null;

const populate: any[] = [
    { path: 'tenant', select: 'name code' },
    { path: 'screening', select: 'status patient camp' },
    { path: 'type', select: 'code name therapy' },
    { path: 'performedBy', select: 'name code' },
];

// ================================ HELPERS ================================

// A non-manage actor may only record/mutate a test for a screening whose camp they are the
// assigned FO of: their role must be a field-officer type AND camp.fo must equal their role id.
// manage-level actors (test:manage / system) bypass this restriction.
const assertAssignedFoOrManage = (camp: any, ctx: RequestContext) => {
    if (ctx.hasAnyPermissions([TEST_PERMISSIONS.MANAGE.code])) {
        return;
    }
    const isFoType = ctx.role?.type?.code === ALLOWED_ROLETYPE_CODES.PLATFORM.FIELD_OFFICER;
    // camp.fo may be a populated role doc or a raw ObjectId — normalise to an id before comparing
    const foId = camp?.fo?._id ?? camp?.fo;
    const isAssigned = foId && ctx.role?._id && foId.toString() === ctx.role._id.toString();
    if (!isFoType || !isAssigned) {
        return throwAppError("Only the field officer assigned to this camp can record its patients' tests", StatusCodes.FORBIDDEN);
    }
};

// Load the screening for a test action and authorize the actor. Reuses ScreeningService.get (tenant
// scope) then CampService.get (populated fo) to assert the actor is the assigned FO (or manage).
// Shared by create + update so the rule lives in one place.
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
    assertAssignedFoOrManage(camp, ctx);

    return screening;
};

// A non-manage actor (e.g. the assigned field officer) sees only the tests they performed.
// A manage actor (test:manage / system) sees them all.
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

    // own-scope LAST so it always wins — a non-manage actor can never widen past their own tests
    applyOwnScope(where, ctx);

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
    //1: load the screening (scope) + authorize the actor as the assigned FO (or manage). The test
    // inherits its tenant from the screening.
    const screening: any = await loadScreeningForAction(model.screening, ctx);

    //2: tests are performed only after the screening itself is completed
    if (screening.status !== SCREENING_STATUS.COMPLETED) {
        return throwAppError('Tests can only be recorded once the screening is completed', StatusCodes.CONFLICT);
    }

    //3: the catalog test (TestMaster) must exist
    const testMaster = await TestMasterService.get(model.type, ctx);
    if (!testMaster) {
        return throwAppError('Test master not found', StatusCodes.NOT_FOUND);
    }

    //4: one result per catalog test per screening
    const { count } = await TestService.search(
        { screening: screening._id.toString(), type: testMaster._id.toString() },
        ctx,
    );
    if (count > 0) {
        return throwAppError('This test has already been recorded for this screening', StatusCodes.CONFLICT);
    }

    //5: build entity — tenant from screening, performedBy = the acting role
    const entity = new TestModel({
        tenant: screening.tenant?._id ?? screening.tenant,
        screening: screening._id,
        type: testMaster._id,
        performedBy: ctx.role?._id,
    });

    let test = await set(model, entity, ctx);
    test = await test.save();

    return test;
};

const update = async (id: string, model: IUpdateTestPayload, ctx: RequestContext) => {
    // get() already own-scopes to performedBy for a non-manage actor, so a field officer can only
    // ever load (and therefore mutate) a test they recorded — no extra assigned-FO check needed.
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
