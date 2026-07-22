// Camp Service
import mongoose, { HydratedDocument } from 'mongoose';
import { CampModel, ICamp } from './camp.model';
import { ICreateCampPayload, IMoveStagePayload, ISearchCampQuery, IUpdateCampPayload } from './camp.validators';
import { CAMP_PERMISSIONS, CAMP_TRANSITION_MAP } from './camp.constants';
import { canTransition } from '../../crm/lead/lead.validators';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../../shared/utils/strings';
import { IServiceOptions } from '../../../shared/types/service.types';
import { ProjectService } from '../../crm/project/project.service';
import { DoctorService } from '../../doctor/doctor.service';
import { RoleService } from '../../access-management/role/role.service';
import { DivisionService } from '../../division/division.service';

type CampDocument = HydratedDocument<ICamp> | null;

const populate: any[] = [
    { path: 'tenant', select: 'name code' },
    { path: 'division', select: 'name code therapy' },
    { path: 'project', select: 'name status' },
    { path: 'doctor', select: 'name specialization pharmaCode' },
    { path: 'fo' },
    { path: 'mr' },
    { path: 'asm' },
    { path: 'rsm' },
];

// ========================================================================================
// HELPERS
// ========================================================================================

// the four field-force slots an actor can occupy — a search-only actor sees a camp only if
// they fill one of these on it.
const ASSIGNMENT_FIELDS = ['fo', 'mr', 'asm', 'rsm'] as const;

// a search-only actor (camp:search, not camp:manage) is scoped to camps they are assigned to.
const applyOwnScope = (where: any, ctx: RequestContext) => {
    if (ctx.hasAnyPermissions([CAMP_PERMISSIONS.SEARCH.code]) && !ctx.hasAnyPermissions([CAMP_PERMISSIONS.MANAGE.code])) {
        where.$or = ASSIGNMENT_FIELDS.map((field) => ({ [field]: ctx.role?._id }));
    }
};

// referenced role must exist (scoped to the actor); throws a labelled 404 otherwise.
const assertRole = async (roleId: string, label: string, ctx: RequestContext) => {
    const role = await RoleService.get(roleId, ctx);
    if (!role) {
        return throwAppError(`${label} not found`, StatusCodes.NOT_FOUND);
    }
};

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

const set = async (model: any, entity: HydratedDocument<ICamp>, ctx: RequestContext) => {
    // doctor — global registry, validated for existence
    if (model.doctor) {
        const doctor = await DoctorService.get(model.doctor, ctx);
        if (!doctor) {
            return throwAppError('Doctor not found', StatusCodes.NOT_FOUND);
        }
        entity.doctor = model.doctor;
    }

    // field-force assignment — each referenced role must exist
    if (model.fo) {
        await assertRole(model.fo, 'FO', ctx);
        entity.fo = model.fo;
    }
    if (model.mr) {
        await assertRole(model.mr, 'MR', ctx);
        entity.mr = model.mr;
    }
    if (model.asm) {
        await assertRole(model.asm, 'ASM', ctx);
        entity.asm = model.asm;
    }
    if (model.rsm) {
        await assertRole(model.rsm, 'RSM', ctx);
        entity.rsm = model.rsm;
    }

    // classification
    if (model.type) entity.type = model.type;
    if (model.billingType) entity.billingType = model.billingType;
    if (model.patientExpectation !== undefined) entity.patientExpectation = model.patientExpectation;

    // slot & location
    if (model.date) entity.date = model.date;
    if (model.timeSlot) (entity as any).timeSlot = model.timeSlot;
    if (model.city) entity.city = model.city;
    if (model.state) entity.state = model.state;

    // devices & confirmation
    if (model.devices) entity.devices = model.devices;
    if (model.notes !== undefined) entity.notes = model.notes;
    if (model.conscentPath !== undefined) entity.conscentPath = model.conscentPath;

    return entity;
};

const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<CampDocument> => {
    if (!isValidObjectID(id)) {
        return null;
    }

    const where: mongoose.QueryFilter<ICamp> = { ...ctx.where(), _id: id };
    applyOwnScope(where, ctx);

    let query = CampModel.findOne(where);

    if (options?.populate) {
        query = query.populate(populate);
    }

    return await query;
};

const search = async (filters: ISearchCampQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { date: -1 };

    //1: default scoping
    const where: mongoose.QueryFilter<ICamp> = { ...ctx.where() };
    applyOwnScope(where, ctx);

    //2: add search filters
    if (filters.project) where.project = filters.project;
    if (filters.division) where.division = filters.division;
    if (filters.doctor) where.doctor = filters.doctor;
    if (filters.fo) where.fo = filters.fo;
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.billingType) where.billingType = filters.billingType;
    if (filters.city) where.city = { $regex: filters.city, $options: 'i' };
    if (filters.state) where.state = { $regex: filters.state, $options: 'i' };

    //3: execute queries
    const countPromise = CampModel.countDocuments(where);
    const dataPromise = CampModel
        .find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

const create = async (model: ICreateCampPayload, ctx: RequestContext): Promise<HydratedDocument<ICamp>> => {
    //1: division must exist (scoped to the actor) and belong to the selected client (tenant).
    // Every camp belongs to a client — tenant + division are compulsory.
    const division = await DivisionService.get(model.division, ctx);
    if (!division) {
        return throwAppError('Division not found', StatusCodes.NOT_FOUND);
    }
    if (division.tenant.toString() !== model.tenant) {
        return throwAppError('The selected division does not belong to the selected client', StatusCodes.BAD_REQUEST);
    }

    //2: optional project link — a camp may stand alone. When linked, the project must exist and
    // belong to the same client; its own division wins over the payload division (source of truth).
    let project: any = null;
    let divisionId: any = division._id;
    if (model.project) {
        const projectDoc = await ProjectService.get(model.project, ctx);
        if (!projectDoc) {
            return throwAppError('Project not found', StatusCodes.NOT_FOUND);
        }
        if (projectDoc.tenant.toString() !== model.tenant) {
            return throwAppError(
                'The selected project does not belong to the selected client',
                StatusCodes.BAD_REQUEST,
            );
        }
        project = projectDoc._id;
        divisionId = projectDoc.division; // project's division takes precedence
    }

    //3: build entity — tenant comes from the validated division (source of truth); division is
    // the project's when linked, else the payload's; project is the optional link.
    const entity = new CampModel({ tenant: division.tenant, division: divisionId, project });

    //4: set validates + applies doctor, field-force and the remaining fields
    let camp = await set(model, entity, ctx);
    camp = await camp.save();

    return camp;
};

const update = async (id: string, model: IUpdateCampPayload, ctx: RequestContext) => {
    //1: get camp first (scoped)
    let camp = await CampService.get(id, ctx);
    if (!camp) {
        return throwAppError('Camp not found', StatusCodes.NOT_FOUND);
    }

    //2: apply editable fields (project/tenant/division/status are not touched here)
    camp = await set(model, camp, ctx);
    camp = await camp.save();

    return camp;
};

// moveStage is the ONLY path allowed to change a camp's status.
const moveStage = async (id: string, model: IMoveStagePayload, ctx: RequestContext) => {
    //1: get camp first (scoped)
    let camp = await CampService.get(id, ctx);
    if (!camp) {
        return throwAppError('Camp not found', StatusCodes.NOT_FOUND);
    }

    const from = camp.status as string;
    const to = model.to;

    //2: guard — no-op move
    if (from === to) {
        return throwAppError(`Camp is already in the '${to}' stage`, StatusCodes.BAD_REQUEST);
    }

    //3: guard — transition must be allowed
    if (!canTransition(CAMP_TRANSITION_MAP, from, to)) {
        return throwAppError(`Invalid stage transition from '${from}' to '${to}'`, StatusCodes.BAD_REQUEST);
    }

    //4: append to the append-only journal + flip the cached status (one atomic save)
    camp.stageHistory.push({
        from,
        to,
        reason: model.reason,
        createdBy: ctx.role?._id || ctx.role?.id,
    } as any);
    camp.status = to;
    camp = await camp.save();

    return camp;
};

export const CampService = {
    get,
    search,
    create,
    update,
    moveStage,
};
