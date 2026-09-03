// Camp Service
import mongoose, { HydratedDocument } from 'mongoose';
import { CampModel, ICamp } from './camp.model';
import { IBookCampPayload, ICreateCampPayload, IMoveStagePayload, ISearchCampQuery, IUpdateCampPayload } from './camp.validators';
import { CAMP_COUNTER_ENTITY, CAMP_PERMISSIONS, CAMP_STATUSES, CAMP_TRANSITION_MAP } from './camp.constants';
import { withTransaction } from '../../../shared/helpers/transactionHelper';
import { CounterService } from '../../counter/counter.service';
import { GeoProfileService } from '../geoProfile/geoProfile.service';
import { GEO_PROFILE_TYPES } from '../geoProfile/geoProfile.constants';
import { canTransition } from '../../crm/lead/lead.validators';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { isValidObjectID, toObjectId } from '../../../shared/utils/strings';
import { endOfUTCDay, utcDayRange } from '../../../shared/utils/dates';
import { IServiceOptions } from '../../../shared/types/service.types';
import { ProjectService } from '../../crm/project/project.service';
import { DoctorService } from '../../doctor/doctor.service';
import { RoleService } from '../../access-management/role/role.service';
import { DivisionService } from '../../crm/division/division.service';
import { ALLOWED_ROLETYPE_CODES } from '../../access-management/role-type/roleType.constants';
import { InventoryMasterService } from '../../inventory/inventory-master/inventory-master.service';
// report-only imports — kept separate so the existing import lines above stay untouched
import { ICampReportQuery } from './camp.validators';
import {
    CAMP_CANCELLED_STATUSES,
    CAMP_NON_TERMINAL_STATUSES,
    CAMP_REPORT_DEFAULT_FUTURE_DAYS,
    CAMP_REPORT_DEFAULT_PAST_DAYS,
    CAMP_REPORT_IMMINENT_DAYS,
    CAMP_REPORT_STALE_LIVE_GRACE_DAYS,
} from './camp.constants';
import { ICampReportServiceResult, ICampReportWindow } from './camp.types';
import { startOfUTCDay } from '../../../shared/utils/dates';

type CampDocument = HydratedDocument<ICamp> | null;

const populate: any[] = [
    { path: 'tenant', select: 'name code' },
    { path: 'division', select: 'name code therapy' },
    { path: 'project', select: 'name status tests' },
    { path: 'doctor', select: 'name specialization pharmaCode' },
    { path: 'fo' },
    { path: 'mr' },
    { path: 'asm' },
    { path: 'rsm' },
    { path: 'devices', select: 'name code type' },
];

// ================================ HELPERS ================================

// field-force slots; a search-only actor sees a camp only if they fill one of these on it.
const ASSIGNMENT_FIELDS = ['fo', 'mr', 'asm', 'rsm'] as const;

const applyOwnScope = (where: any, ctx: RequestContext) => {
    // a pharma division head sees every camp in their division
    if (ctx.role?.type?.code === ALLOWED_ROLETYPE_CODES.CUSTOMER.PHARMA_DIVISION_HEAD) {
        where.division = toObjectId(ctx.role.division);
        return where;
    }

    // any other non-manage actor is scoped to camps they occupy a field-force slot on
    if (!ctx.hasAnyPermissions([CAMP_PERMISSIONS.MANAGE.code])) {
        where.$or = ASSIGNMENT_FIELDS.map((field) => ({ [field]: ctx.role?._id }));
    }

    return where;
};

// statuses that occupy an FO for a date — a confirmed/live camp holds the FO; requested/cancelled do not.
const FO_BOOKING_STATUSES = [CAMP_STATUSES.CONFIRMED, CAMP_STATUSES.LIVE];

// role ids of FOs already booked (confirmed/live) on another camp on the same UTC day.
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

// nearest FO within their own coverage who is not already booked that day. 422 (no coordinates /
// nobody covers) or 409 (everyone nearby booked) on failure.
const resolveNearestFreeFoRole = async (camp: HydratedDocument<ICamp>, ctx: RequestContext): Promise<any> => {
    const coordinates = camp.coordinates as number[] | undefined;
    if (!coordinates || coordinates.length !== 2) {
        return throwAppError('Camp has no location coordinates to allocate from', StatusCodes.UNPROCESSABLE_ENTITY);
    }

    const lng = coordinates[0] as number;
    const lat = coordinates[1] as number;
    const { items } = await GeoProfileService.findNearest({ type: GEO_PROFILE_TYPES.FO, lng, lat }, ctx, {
        pagination: { limit: 100 } as any,
    });
    if (!items.length) {
        return throwAppError('No field officer covers this camp location', StatusCodes.UNPROCESSABLE_ENTITY);
    }

    const booked = await bookedFoRoleIdsOnDate(camp.date, ctx, camp._id);
    const free = items.find((profile: any) => !booked.includes(profile.role?.toString()));
    if (!free) {
        return throwAppError('All field officers near this camp are already booked on this date', StatusCodes.CONFLICT);
    }

    return free.role;
};

// resolve an MR + its chain (asm = mr.supervisor, rsm = asm.supervisor). Loaded under ctx.where()
// so a foreign-tenant MR 404s; validates the role is an MR. asm/rsm may each be null.
const resolveMrChain = async (mrId: string, ctx: RequestContext): Promise<{ mr: any; asm: any; rsm: any }> => {
    const mr: any = await RoleService.get(mrId, ctx, { populate: true });
    if (!mr) {
        return throwAppError('MR not found', StatusCodes.NOT_FOUND);
    }
    if (mr.type?.code !== ALLOWED_ROLETYPE_CODES.CUSTOMER.PHARMA_MR) {
        return throwAppError('The selected role is not an MR', StatusCodes.BAD_REQUEST);
    }

    const asm: any = mr.supervisor ? await RoleService.get(mr.supervisor._id.toString(), ctx, { populate: true }) : null;
    const rsm: any = asm?.supervisor || null;

    return { mr, asm, rsm };
};

// ================================ CORE FUNCTIONS ================================

const set = async (model: any, entity: HydratedDocument<ICamp>, ctx: RequestContext) => {
    // fo + date are the booking key — only editable while `requested`, locked once confirmed/live
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

    // doctor — DoctorService.get runs under ctx.where(), so a foreign-tenant doctor 404s
    if (model.doctor) {
        const doctor = await DoctorService.get(model.doctor, ctx);
        if (!doctor) {
            return throwAppError('Doctor not found', StatusCodes.NOT_FOUND);
        }
        entity.doctor = model.doctor;
    }

    if (model.fo) {
        const fo = await RoleService.get(model.fo, ctx);
        if (!fo) return throwAppError('FO not found', StatusCodes.NOT_FOUND);
        entity.fo = model.fo;
    }
    // mr is the only pharma-chain ref accepted; asm/rsm are derived from it (reset when the MR changes)
    if (model.mr) {
        const { mr, asm, rsm } = await resolveMrChain(model.mr, ctx);
        entity.mr = mr._id;
        entity.asm = asm?._id ?? null;
        entity.rsm = rsm?._id ?? null;
    }

    if (model.type) entity.type = model.type;
    if (model.billingType) entity.billingType = model.billingType;
    if (model.patientExpectation !== undefined) entity.patientExpectation = model.patientExpectation;

    if (model.date) entity.date = model.date;
    if (model.timeSlot) (entity as any).timeSlot = model.timeSlot;
    if (model.city) entity.city = model.city;
    if (model.state) entity.state = model.state;
    if (model.coordinates) entity.coordinates = model.coordinates;

    // each device must reference an existing catalog item (InventoryMaster)
    if (model.devices) {
        for (const deviceId of model.devices) {
            const device = await InventoryMasterService.get(deviceId, ctx);
            if (!device) {
                return throwAppError(`Device '${deviceId}' not found`, StatusCodes.NOT_FOUND);
            }
        }
        entity.devices = model.devices;
    }
    if (model.notes !== undefined) entity.notes = model.notes;
    if (model.conscentPath !== undefined) entity.conscentPath = model.conscentPath;

    return entity;
};

const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<CampDocument> => {
    const where: mongoose.QueryFilter<ICamp> = ctx.where();

    if (isValidObjectID(id)) {
        where._id = id;
    } else {
        where.code = id;
    }
    applyOwnScope(where, ctx);

    let query = CampModel.findOne(where);

    if (query) {
        if (options?.populate) {
            query = query.populate(populate);
        }
    }

    return await query;
};

const search = async (filters: ISearchCampQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { date: -1 };

    const where: mongoose.QueryFilter<ICamp> = { ...ctx.where() };
    applyOwnScope(where, ctx);

    // tenant filter (switch tenants) is only honoured for a `camp:manage` actor not already
    // tenant-pinned by ctx.where() — a customer actor stays locked to their own tenant.
    if (filters.tenant && !where.tenant && ctx.hasAnyPermissions([CAMP_PERMISSIONS.MANAGE.code])) {
        where.tenant = filters.tenant;
    }
    if (filters.project) where.project = filters.project;
    if (filters.division) where.division = filters.division;
    if (filters.doctor) where.doctor = filters.doctor;
    if (filters.fo) where.fo = filters.fo;
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.billingType) where.billingType = filters.billingType;
    if (filters.city) where.city = { $regex: filters.city, $options: 'i' };
    if (filters.state) where.state = { $regex: filters.state, $options: 'i' };
    // date range — dateTo is snapped to end-of-day (UTC) so the whole end day is included
    if (filters.dateFrom || filters.dateTo) {
        where.date = {};
        if (filters.dateFrom) where.date.$gte = filters.dateFrom;
        if (filters.dateTo) where.date.$lte = endOfUTCDay(filters.dateTo);
    }

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
    //1: division must exist (scoped) and belong to the selected client (tenant)
    const division = await DivisionService.get(model.division, ctx);
    if (!division) {
        return throwAppError('Division not found', StatusCodes.NOT_FOUND);
    }
    if (division.tenant.toString() !== model.tenant) {
        return throwAppError('The selected division does not belong to the selected client', StatusCodes.BAD_REQUEST);
    }

    //2: optional project link — when linked it must belong to the same client; its division wins
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
        divisionId = projectDoc.division;
    }

    //3: build entity (tenant from the validated division) + apply the rest via set()
    const entity = new CampModel({ tenant: division.tenant, division: divisionId, project });
    let camp = await set(model, entity, ctx);

    //4: best-effort auto-assign the nearest free FO when none supplied. On failure the camp stays
    // requested with no FO — moveStage guard 3b then blocks it leaving requested until one is set.
    if (!camp.fo) {
        try {
            const foRole = await resolveNearestFreeFoRole(camp, ctx);
            camp = await set({ fo: foRole.toString() }, camp, ctx);
        } catch (error: any) {
            ctx.logger.warn({ err: error }, 'No field officer could be auto-allocated; camp stays in requested with no FO');
        }
    }

    //5: reserve the sequential code + persist in a txn ($geoNear above stays outside the txn)
    const saved = await withTransaction(async () => {
        camp.code = await CounterService.next(CAMP_COUNTER_ENTITY, ctx);
        return await camp.save();
    });

    return saved;
};

const update = async (id: string, model: IUpdateCampPayload, ctx: RequestContext) => {
    let camp = await CampService.get(id, ctx);
    if (!camp) {
        return throwAppError('Camp not found', StatusCodes.NOT_FOUND);
    }

    // a camp is only editable while `requested`; once confirmed (or beyond) the only change is a
    // status move through moveStage(). Subsumes the narrower fo/date lock in set().
    if (camp.status !== CAMP_STATUSES.REQUESTED) {
        return throwAppError('A camp can only be edited while it is in the requested stage', StatusCodes.CONFLICT);
    }

    camp = await set(model, camp, ctx);
    camp = await camp.save();

    return camp;
};

// moveStage is the ONLY path allowed to change a camp's status.
const moveStage = async (id: string, model: IMoveStagePayload, ctx: RequestContext) => {
    let camp = await CampService.get(id, ctx);
    if (!camp) {
        return throwAppError('Camp not found', StatusCodes.NOT_FOUND);
    }

    const from = camp.status as string;
    const to = model.to;

    if (from === to) {
        return throwAppError(`Camp is already in the '${to}' stage`, StatusCodes.BAD_REQUEST);
    }
    if (!canTransition(CAMP_TRANSITION_MAP, from, to)) {
        return throwAppError(`Invalid stage transition from '${from}' to '${to}'`, StatusCodes.BAD_REQUEST);
    }

    // a camp cannot leave `requested` without an FO (cancellation is exempt)
    const isCancel = to === CAMP_STATUSES.CANCELLED || to === CAMP_STATUSES.CANCELLED_CHARGED;
    if (from === CAMP_STATUSES.REQUESTED && !isCancel && !camp.fo) {
        return throwAppError(
            'A field officer must be assigned before this camp can leave the requested stage',
            StatusCodes.UNPROCESSABLE_ENTITY,
        );
    }

    // a camp cannot be confirmed if its FO is already booked on another camp the same day
    if (to === CAMP_STATUSES.CONFIRMED && camp.fo) {
        const booked = await bookedFoRoleIdsOnDate(camp.date, ctx, camp._id);
        if (booked.includes(camp.fo.toString())) {
            return throwAppError('Field officer is already booked on another camp on this date', StatusCodes.CONFLICT);
        }
    }

    // append to the journal + flip the cached status; snapshot the actor so history stays true
    const actorName = `${ctx.user?.firstName || ''} ${ctx.user?.lastName || ''}`.trim();
    camp.stageHistory.push({
        from,
        to,
        reason: model.reason,
        actor: {
            roleId: ctx.role?._id || ctx.role?.id,
            name: actorName || undefined,
            email: ctx.user?.email,
        },
    } as any);
    camp.status = to;
    camp = await camp.save();

    return camp;
};

// manual/retry counterpart to create()'s auto-assign: re-runs the nearest-free-FO search and
// assigns THROUGH update() so all update-path rules apply.
const allocateFo = async (id: string, ctx: RequestContext) => {
    const camp = await CampService.get(id, ctx);
    if (!camp) {
        return throwAppError('Camp not found', StatusCodes.NOT_FOUND);
    }

    // FO (re)allocation is only allowed while `requested`; checked up front so we skip the geo
    // search when locked. update() still backstops this.
    if (camp.status !== CAMP_STATUSES.REQUESTED) {
        return throwAppError('A field officer can only be allocated while the camp is in the requested stage', StatusCodes.CONFLICT);
    }

    const foRole = await resolveNearestFreeFoRole(camp, ctx);

    return CampService.update(id, { fo: foRole.toString() }, ctx);
};

// authorize a pharma booker against the target MR by the caller's own role type:
//   MR → self only; ASM → direct-report MRs; RSM → MRs under their ASMs; division head → MRs in
//   their division. Anyone else is rejected 403. asm/rsm are the resolved chain of the target MR.
const assertCanBook = (mr: any, asm: any, rsm: any, ctx: RequestContext) => {
    const { CUSTOMER } = ALLOWED_ROLETYPE_CODES;
    const callerCode: string | undefined = ctx.role?.type?.code;
    const me = ctx.role?._id?.toString();

    switch (callerCode) {
        case CUSTOMER.PHARMA_MR: {
            if (mr._id.toString() !== me) {
                return throwAppError('An MR can only book a camp for themselves', StatusCodes.FORBIDDEN);
            }
            return;
        }
        case CUSTOMER.PHARMA_ASM: {
            if (!asm || asm._id.toString() !== me) {
                return throwAppError('You can only book for MRs that report to you', StatusCodes.FORBIDDEN);
            }
            return;
        }
        case CUSTOMER.PHARMA_RSM: {
            if (!rsm || rsm._id.toString() !== me) {
                return throwAppError('You can only book for MRs under your ASMs', StatusCodes.FORBIDDEN);
            }
            return;
        }
        case CUSTOMER.PHARMA_DIVISION_HEAD: {
            if (mr.division?._id?.toString() !== ctx.role?.division?.toString()) {
                return throwAppError('You can only book for MRs in your division', StatusCodes.FORBIDDEN);
            }
            return;
        }
        default: {
            return throwAppError('You are not allowed to book camps', StatusCodes.FORBIDDEN);
        }
    }
};

// a project may restrict which pharma role types can book against it (whoCanBookCamp); empty/unset
// means no restriction. Enforced only on the pharma booking path — create() (internal staff) is not.
const assertRoleTypeCanBookProject = (project: any, ctx: RequestContext) => {
    const allowed: string[] = project.whoCanBookCamp || [];
    if (!allowed.length) {
        return;
    }
    const callerCode: string | undefined = ctx.role?.type?.code;
    if (!callerCode || !allowed.includes(callerCode)) {
        return throwAppError('Your role is not allowed to book camps on this project', StatusCodes.FORBIDDEN);
    }
};

// pharma field-force entry point: resolve the MR, authorize the caller + project scope, derive the
// chain + tenant/division, then hand off to create() for the real work.
const book = async (model: IBookCampPayload, ctx: RequestContext): Promise<HydratedDocument<ICamp>> => {
    const { CUSTOMER } = ALLOWED_ROLETYPE_CODES;
    const callerCode: string | undefined = ctx.role?.type?.code;
    const me = ctx.role?._id?.toString();

    //1: resolve the target MR — an MR books only for themselves; a manager names the downline MR
    let targetMrId = model.mr;
    if (callerCode === CUSTOMER.PHARMA_MR) {
        if (model.mr && model.mr !== me) {
            return throwAppError('An MR can only book a camp for themselves', StatusCodes.FORBIDDEN);
        }
        targetMrId = me;
    }
    if (!targetMrId) {
        return throwAppError('mr is required', StatusCodes.BAD_REQUEST);
    }

    //2: load the MR + derive its chain (scoped, so a foreign-tenant MR 404s)
    const { mr, asm, rsm } = await resolveMrChain(targetMrId, ctx);

    if (mr.tenant?._id?.toString() !== ctx.tenant?._id?.toString()) {
        return throwAppError('The MR belongs to a different client', StatusCodes.BAD_REQUEST);
    }
    if (!mr.division) {
        return throwAppError('The MR is not assigned to a division', StatusCodes.BAD_REQUEST);
    }

    //3: authorize the caller against this MR + chain
    assertCanBook(mr, asm, rsm, ctx);

    //4: enforce the project's booking scope. project is loaded under ctx.where() (outside-scope
    // 404s) and is immutable on a camp, so this book-time check is the only place it's needed.
    const project = await ProjectService.get(model.project, ctx);
    if (!project) {
        return throwAppError('Project not found', StatusCodes.NOT_FOUND);
    }
    assertRoleTypeCanBookProject(project, ctx);

    //5: hand off to create() — tenant from ctx, division from the MR, only the MR passed through
    // (create() re-derives asm/rsm and best-effort allocates the FO)
    const createPayload: ICreateCampPayload = {
        tenant: ctx.tenant._id.toString(),
        division: mr.division._id.toString(),
        project: model.project,
        doctor: model.doctor,
        mr: mr._id.toString(),
        type: model.type,
        patientExpectation: model.patientExpectation,
        date: model.date,
        timeSlot: model.timeSlot,
        city: model.city,
        state: model.state,
        coordinates: model.coordinates,
        devices: model.devices,
        notes: model.notes,
        conscentPath: model.conscentPath,
    };

    return CampService.create(createPayload, ctx);
};

// ================================ REPORT ================================

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const ROLE_COLLECTION = 'roles'; // mongoose lowercase-pluralizes 'Role'; only used for the FO name/code lookup

const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * DAY_MS);

// Resolve the report window: caller bounds win, documented defaults otherwise. Both ends snap to
// whole UTC days so the window is stable regardless of server timezone — same convention as search().
const resolveReportWindow = (filters: ICampReportQuery, now: Date): ICampReportWindow => {
    const from = startOfUTCDay(filters.from ?? addDays(now, -CAMP_REPORT_DEFAULT_PAST_DAYS));
    const to = endOfUTCDay(filters.to ?? addDays(now, CAMP_REPORT_DEFAULT_FUTURE_DAYS));

    return { from, to, basis: 'date' };
};

const report = async (filters: ICampReportQuery, ctx: RequestContext): Promise<ICampReportServiceResult> => {
    const generatedAt = new Date();
    const window = resolveReportWindow(filters, generatedAt);

    const todayStart = startOfUTCDay(generatedAt);
    const todayEnd = endOfUTCDay(generatedAt);
    const next7End = endOfUTCDay(addDays(generatedAt, CAMP_REPORT_IMMINENT_DAYS));
    const next30End = endOfUTCDay(addDays(generatedAt, 30));
    // one day of grace: a camp scheduled yesterday is not yet stale, the day before that is
    const staleLiveCutoff = startOfUTCDay(addDays(generatedAt, -CAMP_REPORT_STALE_LIVE_GRACE_DAYS));

    // reused by every window-scoped branch as its first stage
    const inWindow = { $match: { date: { $gte: window.from, $lte: window.to } } };

    const [raw] = await CampModel.aggregate([
        // tenant isolation — applied ONCE, before all branches
        { $match: { ...ctx.where() } },
        {
            $facet: {
                // ── WINDOW-SCOPED ─────────────────────────────────────────────────
                total: [inWindow, { $count: 'count' }],
                statusCounts: [inWindow, { $group: { _id: '$status', count: { $sum: 1 } } }],
                typeCounts: [inWindow, { $group: { _id: '$type', count: { $sum: 1 } } }],
                billingTypeCounts: [inWindow, { $group: { _id: '$billingType', count: { $sum: 1 } } }],
                timeSlotCounts: [inWindow, { $group: { _id: '$timeSlot', count: { $sum: 1 } } }],
                stateCounts: [inWindow, { $group: { _id: '$state', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }],

                byFieldOfficer: [
                    inWindow,
                    {
                        $group: {
                            _id: '$fo', // null groups every unallocated camp into one bucket, on purpose
                            total: { $sum: 1 },
                            upcoming: {
                                $sum: {
                                    $cond: [
                                        { $and: [{ $in: ['$status', CAMP_NON_TERMINAL_STATUSES] }, { $gte: ['$date', todayStart] }] },
                                        1,
                                        0,
                                    ],
                                },
                            },
                            closed: { $sum: { $cond: [{ $eq: ['$status', CAMP_STATUSES.CLOSED] }, 1, 0] } },
                            cancelled: { $sum: { $cond: [{ $in: ['$status', CAMP_CANCELLED_STATUSES] }, 1, 0] } },
                        },
                    },
                    {
                        // pipeline form so only name/code cross the wire — a Role also carries a
                        // permissions array this report has no use for
                        $lookup: {
                            from: ROLE_COLLECTION,
                            let: { foId: '$_id' },
                            pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$foId'] } } }, { $project: { name: 1, code: 1 } }],
                            as: 'foDoc',
                        },
                    },
                    { $sort: { total: -1, _id: 1 } },
                ],

                // scheduled-date trend — grouped on `date`, never createdAt: this answers "how much
                // work is scheduled and how much of it landed", not "when were bookings taken"
                trend: [
                    inWindow,
                    {
                        $group: {
                            _id: { $dateToString: { format: '%Y-%m', date: '$date', timezone: 'UTC' } },
                            scheduled: { $sum: 1 },
                            closed: { $sum: { $cond: [{ $eq: ['$status', CAMP_STATUSES.CLOSED] }, 1, 0] } },
                            cancelled: { $sum: { $cond: [{ $in: ['$status', CAMP_CANCELLED_STATUSES] }, 1, 0] } },
                        },
                    },
                    { $sort: { _id: 1 } },
                ],

                turnaround: [
                    inWindow,
                    { $match: { 'stageHistory.to': CAMP_STATUSES.CONFIRMED } },
                    {
                        $addFields: {
                            confirmedEntry: {
                                $arrayElemAt: [
                                    {
                                        $filter: {
                                            input: { $ifNull: ['$stageHistory', []] },
                                            cond: { $eq: ['$$this.to', CAMP_STATUSES.CONFIRMED] },
                                        },
                                    },
                                    0,
                                ],
                            },
                        },
                    },
                    // both endpoints must be real dates before any arithmetic
                    { $match: { 'confirmedEntry.createdAt': { $type: 'date' }, createdAt: { $type: 'date' } } },
                    { $addFields: { hours: { $divide: [{ $subtract: ['$confirmedEntry.createdAt', '$createdAt'] }, HOUR_MS] } } },
                    // drop nonsensical negatives (clock skew / back-dated writes) rather than letting
                    // them drag the average down
                    { $match: { hours: { $gte: 0 } } },
                    {
                        $group: {
                            _id: null,
                            avg: { $avg: '$hours' },
                            sampleSize: { $sum: 1 },
                        },
                    },
                ],

                // ── CURRENT STATE (window-independent, by design) ─────────────────
                liveNow: [{ $match: { status: CAMP_STATUSES.LIVE } }, { $count: 'count' }],
                scheduledToday: [
                    { $match: { status: { $in: CAMP_NON_TERMINAL_STATUSES }, date: { $gte: todayStart, $lte: todayEnd } } },
                    { $count: 'count' },
                ],
                scheduledNext7Days: [
                    { $match: { status: { $in: CAMP_NON_TERMINAL_STATUSES }, date: { $gte: todayStart, $lte: next7End } } },
                    { $count: 'count' },
                ],
                scheduledNext30Days: [
                    { $match: { status: { $in: CAMP_NON_TERMINAL_STATUSES }, date: { $gte: todayStart, $lte: next30End } } },
                    { $count: 'count' },
                ],

                // ── EXCEPTIONS (current state) ────────────────────────────────────
                unallocated: [{ $match: { status: CAMP_STATUSES.REQUESTED, fo: null } }, { $count: 'count' }],
                unallocatedImminent: [
                    { $match: { status: CAMP_STATUSES.REQUESTED, fo: null, date: { $gte: todayStart, $lte: next7End } } },
                    { $count: 'count' },
                ],
                staleLive: [{ $match: { status: CAMP_STATUSES.LIVE, date: { $lt: staleLiveCutoff } } }, { $count: 'count' }],
                staleConfirmed: [{ $match: { status: CAMP_STATUSES.CONFIRMED, date: { $lt: todayStart } } }, { $count: 'count' }],
                noProject: [{ $match: { project: null } }, { $count: 'count' }],
                noCoordinates: [
                    {
                        $match: {
                            $expr: {
                                $ne: [{ $cond: [{ $isArray: '$coordinates' }, { $size: '$coordinates' }, 0] }, 2],
                            },
                        },
                    },
                    { $count: 'count' },
                ],
            },
        },
    ]);

    return { ...(raw as ICampReportServiceResult), generatedAt, window };
};

export const CampService = {
    get,
    search,
    create,
    update,
    moveStage,
    allocateFo,
    book,
    report,
};
