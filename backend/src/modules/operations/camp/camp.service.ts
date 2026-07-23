// Camp Service
import mongoose, { HydratedDocument } from 'mongoose';
import { CampModel, ICamp } from './camp.model';
import { ICreateCampPayload, IMoveStagePayload, ISearchCampQuery, IUpdateCampPayload } from './camp.validators';
import { CAMP_PERMISSIONS, CAMP_STATUSES, CAMP_TRANSITION_MAP } from './camp.constants';
import { GeoProfileService } from '../geoProfile/geoProfile.service';
import { GEO_PROFILE_TYPES } from '../geoProfile/geoProfile.constants';
import { canTransition } from '../../crm/lead/lead.validators';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../../shared/utils/strings';
import { endOfUTCDay, utcDayRange } from '../../../shared/utils/dates';
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

// camp statuses that OCCUPY an FO for a date: a confirmed or live camp holds the FO. A merely
// requested camp (not yet locked in) does not block, and cancelled camps never do.
const FO_BOOKING_STATUSES = [CAMP_STATUSES.CONFIRMED, CAMP_STATUSES.LIVE];

// role ids of FOs already booked (confirmed/live) on another camp on the SAME UTC calendar day.
// Shared by the allocation filter and the confirm-time guard so both use one definition of "busy".
const bookedFoRoleIdsOnDate = async (date: Date, ctx: RequestContext, excludeCampId: any): Promise<string[]> => {
    const camps = await CampModel.find({
        ...ctx.where(),
        _id: { $ne: excludeCampId },
        fo: { $ne: null },
        status: { $in: FO_BOOKING_STATUSES },
        date: utcDayRange(date),
    })
        .select('fo')
        .lean();

    return camps.map((c: any) => c.fo?.toString()).filter(Boolean);
};

// the allocation core: nearest FO within their own coverage (capped by GEO_ALLOCATION_MAX_DISTANCE)
// who is NOT already booked on a confirmed/live camp that day. Throws a specific message at each
// failure branch: no coordinates → 422, nobody in coverage → 422, everybody nearby booked → 409.
const resolveNearestFreeFoRole = async (camp: HydratedDocument<ICamp>, ctx: RequestContext): Promise<any> => {
    //1: a point is required to search around
    const coordinates = camp.coordinates as number[] | undefined;
    if (!coordinates || coordinates.length !== 2) {
        return throwAppError('Camp has no location coordinates to allocate from', StatusCodes.UNPROCESSABLE_ENTITY);
    }

    //2: candidates within their own coverage + the hard cap, nearest first
    const lng = coordinates[0] as number;
    const lat = coordinates[1] as number;
    const { items } = await GeoProfileService.findNearest({ type: GEO_PROFILE_TYPES.FO, lng, lat }, ctx, {
        pagination: { limit: 100 } as any,
    });
    if (!items.length) {
        return throwAppError('No field officer covers this camp location', StatusCodes.UNPROCESSABLE_ENTITY);
    }

    //3: drop those already booked (confirmed/live) that day; the nearest survivor wins
    const booked = await bookedFoRoleIdsOnDate(camp.date, ctx, camp._id);
    const free = items.find((profile: any) => !booked.includes(profile.role?.toString()));
    if (!free) {
        return throwAppError('All field officers near this camp are already booked on this date', StatusCodes.CONFLICT);
    }

    return free.role;
};

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

const set = async (model: any, entity: HydratedDocument<ICamp>, ctx: RequestContext) => {
    // fo + date are the booking key and are only editable while the camp is `requested`. Once
    // confirmed/live the booking is locked; availability is then validated solely by the confirm
    // transition (moveStage 3c). A new camp defaults to `requested`, so this never blocks create.
    if (entity.status !== CAMP_STATUSES.REQUESTED) {
        const changingFo = model.fo && model.fo !== entity.fo?.toString();
        const changingDate = model.date && new Date(model.date).getTime() !== entity.date?.getTime();
        if (changingFo || changingDate) {
            return throwAppError(
                'Field officer and date can only be changed while the camp is in the requested stage',
                StatusCodes.CONFLICT,
            );
        }
    }

    // doctor — global registry, validated for existence
    if (model.doctor) {
        const doctor = await DoctorService.get(model.doctor, ctx);
        if (!doctor) {
            return throwAppError('Doctor not found', StatusCodes.NOT_FOUND);
        }
        entity.doctor = model.doctor;
    }

    // field-force assignment — each referenced role must exist (scoped to the actor)
    if (model.fo) {
        const fo = await RoleService.get(model.fo, ctx);
        if (!fo) return throwAppError('FO not found', StatusCodes.NOT_FOUND);
        entity.fo = model.fo;
    }
    if (model.mr) {
        // FIXME:here when getting mr, its supervisors asm and rsm shoudl be populated to save queryies(optimization)
        const mr = await RoleService.get(model.mr, ctx);
        if (!mr) return throwAppError('MR not found', StatusCodes.NOT_FOUND);
        entity.mr = model.mr;
    }
    if (model.asm) {
        const asm = await RoleService.get(model.asm, ctx);
        if (!asm) return throwAppError('ASM not found', StatusCodes.NOT_FOUND);
        entity.asm = model.asm;
    }
    if (model.rsm) {
        const rsm = await RoleService.get(model.rsm, ctx);
        if (!rsm) return throwAppError('RSM not found', StatusCodes.NOT_FOUND);
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
    if (model.coordinates) entity.coordinates = model.coordinates;

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
    // date range — apply whichever bound(s) were supplied. dateTo is snapped to end-of-day (UTC) so
    // the whole end day is included (a camp later on the dateTo day still matches).
    if (filters.dateFrom || filters.dateTo) {
        where.date = {};
        if (filters.dateFrom) where.date.$gte = filters.dateFrom;
        if (filters.dateTo) where.date.$lte = endOfUTCDay(filters.dateTo);
    }

    //3: execute queries
    const countPromise = CampModel.countDocuments(where);
    const dataPromise = CampModel.find(where)
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
            return throwAppError('The selected project does not belong to the selected client', StatusCodes.BAD_REQUEST);
        }
        project = projectDoc._id;
        divisionId = projectDoc.division; // project's division takes precedence
    }

    //3: build entity — tenant comes from the validated division (source of truth); division is
    // the project's when linked, else the payload's; project is the optional link.
    const entity = new CampModel({ tenant: division.tenant, division: divisionId, project });

    //4: set validates + applies doctor, field-force and the remaining fields
    let camp = await set(model, entity, ctx);

    //5: auto-assign the nearest free FO when the caller didn't supply one, applied through set() so
    // it takes the same validation path. NOT best-effort: resolveNearestFreeFoRole throws (no
    // coverage / all booked) so a camp is never created without a staffable FO.
    if (!camp.fo) {
        const foRole = await resolveNearestFreeFoRole(camp, ctx);
        camp = await set({ fo: foRole.toString() }, camp, ctx);
    }

    camp = await camp.save();

    return camp;
};

const update = async (id: string, model: IUpdateCampPayload, ctx: RequestContext) => {
    //1: get camp first (scoped)
    let camp = await CampService.get(id, ctx);
    if (!camp) {
        return throwAppError('Camp not found', StatusCodes.NOT_FOUND);
    }

    //2: apply editable fields (project/tenant/division/status are not touched here). set() also
    // enforces the fo/date lock — both are frozen once the camp leaves `requested`.
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

    //3b: a camp cannot leave `requested` without a field officer — it may only stay requested or be
    // cancelled. Cancellation is exempt (a bad request must be closable even with no FO assigned).
    const isCancel = to === CAMP_STATUSES.CANCELLED || to === CAMP_STATUSES.CANCELLED_CHARGED;
    if (from === CAMP_STATUSES.REQUESTED && !isCancel && !camp.fo) {
        return throwAppError(
            'A field officer must be assigned before this camp can leave the requested stage',
            StatusCodes.UNPROCESSABLE_ENTITY,
        );
    }

    //3c: a camp cannot be confirmed if its FO is already booked (confirmed/live) on another camp the
    // same day. Backstops manual assignment and the create-time race (two camps auto-picking the same
    // still-free FO). The camp stays `requested` until the FO frees up or a different FO is assigned.
    if (to === CAMP_STATUSES.CONFIRMED && camp.fo) {
        const booked = await bookedFoRoleIdsOnDate(camp.date, ctx, camp._id);
        if (booked.includes(camp.fo.toString())) {
            return throwAppError('Field officer is already booked on another camp on this date', StatusCodes.CONFLICT);
        }
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

// allocateFo is the explicit (manual / retry) counterpart to the auto-assign in create(): it
// re-runs the nearest-free-FO search for an existing camp. It resolves the FO, then assigns it
// THROUGH update() — so role validation and the requested-only fo/date lock apply here too
// (allocating onto a confirmed/live camp is rejected, same as any other edit).
const allocateFo = async (id: string, ctx: RequestContext) => {
    //1: get camp first (scoped)
    const camp = await CampService.get(id, ctx);
    if (!camp) {
        return throwAppError('Camp not found', StatusCodes.NOT_FOUND);
    }

    //2: nearest free FO within coverage; throws when none qualifies
    const foRole = await resolveNearestFreeFoRole(camp, ctx);

    //3: assign via the core update so all update-path rules (validation + lock) apply
    return CampService.update(id, { fo: foRole.toString() }, ctx);
};

export const CampService = {
    get,
    search,
    create,
    update,
    moveStage,
    allocateFo,
};
