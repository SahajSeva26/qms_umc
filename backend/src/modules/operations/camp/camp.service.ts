// Camp Service
import mongoose, { HydratedDocument } from 'mongoose';
import { CampModel, ICamp } from './camp.model';
import {
    IApproveVoidCampPayload,
    IBookCampPayload,
    IBookingAvailabilityPayload,
    ICampReportQuery,
    ICreateCampPayload,
    IMoveStagePayload,
    ISearchCampQuery,
    IUpdateCampPayload,
    IVoidCampPayload,
} from './camp.validators';
import {
    BILLING_TYPES,
    CAMP_COUNTER_ENTITY,
    CAMP_PERMISSIONS,
    CAMP_STATUSES,
    CAMP_TIME_SLOTS,
    CAMP_TRANSITION_MAP,
    CAMP_TYPES,
    CampTimeSlot,
} from './camp.constants';
import { CampDocument, CampStats, FieldWorker } from './camp.types';
import { withTransaction } from '../../../shared/helpers/transactionHelper';
import { CounterService } from '../../counter/counter.service';
import { geoProfileModel } from '../geoProfile/geoProfile.model';
import { GEO_ALLOCATION_MAX_DISTANCE, GEO_PROFILE_STATUS, GEO_PROFILE_TYPES } from '../geoProfile/geoProfile.constants';
import { mapsManager } from '../../../shared/providers/maps/maps';
import { GOOGLE_MAPS } from '../../../shared/providers/maps/google/google.provider';
import { canTransition } from '../../crm/lead/lead.validators';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { isValidObjectID, toObjectId } from '../../../shared/utils/strings';
import { endOfUTCDay, startOfUTCDay, utcDayRange } from '../../../shared/utils/dates';
import { IServiceOptions } from '../../../shared/types/service.types';
import { ProjectService } from '../../crm/project/project.service';
import { DoctorService } from '../../crm/doctor/doctor.service';
import { RoleService } from '../../access-management/role/role.service';
import { DivisionService } from '../../crm/division/division.service';
import { ALLOWED_ROLETYPE_CODES } from '../../access-management/role-type/roleType.constants';
import { RoleModel } from '../../access-management/role/role.model';
import { TENANT_TYPE } from '../../access-management/tenant/tenant.constants';
import { InventoryMasterService } from '../../inventory/inventory-master/inventory-master.service';
import { Project } from '../../crm/project/project.model';
import { PROJECT_STATUS } from '../../crm/project/project.constants';
import { TestMasterModel } from '../testMaster/testMaster.model';
import { ScreeningModel } from '../screening/screening.model';
import { SCREENING_STATUS } from '../screening/screening.constants';
import { InventoryMasterModel } from '../../inventory/inventory-master/inventory-master.model';
import { InventoryAssignmentModel } from '../../inventory/inventory-assignment/inventory-assignment.model';
import { INVENTORY_DEVICE_STATUS } from '../../inventory/inventory-device/inventory-device.constants';
import { ITEM_TYPES } from '../../inventory/inventory-master/inventory-master.constants';

const populate: any[] = [
    { path: 'tenant', select: 'name code' },
    { path: 'division', select: 'name code therapy' },
    { path: 'project', select: 'name status tests' },
    { path: 'doctor', select: 'name specialization pharmaCode' },
    { path: 'fo' },
    { path: 'dietitian' },
    { path: 'mr' },
    { path: 'asm' },
    { path: 'rsm' },
    { path: 'devices', select: 'name code type' },
];

// ================================ HELPERS ================================

// FieldWorker (camp.types) is the only place the FO/dietitian difference lives; every helper reads it.
const FO_WORKER: FieldWorker = {
    field: 'fo',
    geoType: GEO_PROFILE_TYPES.FO,
    roleTypeCode: ALLOWED_ROLETYPE_CODES.PLATFORM.FIELD_OFFICER,
    label: 'field officer',
};

const DIETITIAN_WORKER: FieldWorker = {
    field: 'dietitian',
    geoType: GEO_PROFILE_TYPES.DIETITIAN,
    roleTypeCode: ALLOWED_ROLETYPE_CODES.PLATFORM.DIETITIAN,
    label: 'dietitian',
};

// the single branch for the whole feature: pick the worker kind from a camp type.
const workerFor = (campType?: string): FieldWorker => (campType === CAMP_TYPES.DIET ? DIETITIAN_WORKER : FO_WORKER);

// field-force slots; a search-only actor sees a camp only if they fill one of these on it.
const ASSIGNMENT_FIELDS = ['fo', 'dietitian', 'mr', 'asm', 'rsm'] as const;

// a field-force role type is scoped to the single camp field it occupies — an FO to `fo`, a
// dietitian to `dietitian`, an MR to `mr`. Keeps "my camps" precise instead of matching any slot.
const OWN_SCOPE_FIELD_BY_ROLE_TYPE: Record<string, string> = {
    [ALLOWED_ROLETYPE_CODES.PLATFORM.FIELD_OFFICER]: 'fo',
    [ALLOWED_ROLETYPE_CODES.PLATFORM.DIETITIAN]: 'dietitian',
    [ALLOWED_ROLETYPE_CODES.CUSTOMER.PHARMA_MR]: 'mr',
};

const applyOwnScope = (where: any, ctx: RequestContext) => {
    // a pharma division head sees every camp in their division
    if (ctx.role?.type?.code === ALLOWED_ROLETYPE_CODES.CUSTOMER.PHARMA_DIVISION_HEAD) {
        where.division = toObjectId(ctx.role.division);
        return where;
    }

    // a manage actor is unscoped
    if (ctx.hasAnyPermissions([CAMP_PERMISSIONS.MANAGE.code])) {
        return where;
    }

    // FO / dietitian / MR are scoped to the specific slot their role type fills
    const field = OWN_SCOPE_FIELD_BY_ROLE_TYPE[ctx.role?.type?.code];
    if (field) {
        where[field] = ctx.role?._id;
        return where;
    }

    // any other non-manage actor (e.g. asm/rsm) is scoped to camps they occupy any field-force slot on
    where.$or = ASSIGNMENT_FIELDS.map((f) => ({ [f]: ctx.role?._id }));
    return where;
};

// statuses that occupy an FO for a slot — a confirmed/live camp holds the FO; requested/cancelled do not.
const FO_BOOKING_STATUSES = [CAMP_STATUSES.CONFIRMED, CAMP_STATUSES.LIVE];

// the four bookable slots, in display order.
const ALL_SLOTS = Object.values(CAMP_TIME_SLOTS);

// which slots each slot overlaps. The three daytime slots (9-1/10-2/11-3) all overlap one another,
// so a camp on any of them holds the FO for all three; the evening slot (6-10) stands alone. A camp
// on slot S therefore blocks its FO for every slot in SLOT_OVERLAPS[S].
const SLOT_OVERLAPS: Record<CampTimeSlot, CampTimeSlot[]> = {
    [CAMP_TIME_SLOTS.SLOT_9_1]: [CAMP_TIME_SLOTS.SLOT_9_1, CAMP_TIME_SLOTS.SLOT_10_2, CAMP_TIME_SLOTS.SLOT_11_3],
    [CAMP_TIME_SLOTS.SLOT_10_2]: [CAMP_TIME_SLOTS.SLOT_9_1, CAMP_TIME_SLOTS.SLOT_10_2, CAMP_TIME_SLOTS.SLOT_11_3],
    [CAMP_TIME_SLOTS.SLOT_11_3]: [CAMP_TIME_SLOTS.SLOT_9_1, CAMP_TIME_SLOTS.SLOT_10_2, CAMP_TIME_SLOTS.SLOT_11_3],
    [CAMP_TIME_SLOTS.SLOT_6_10]: [CAMP_TIME_SLOTS.SLOT_6_10],
};

// pure, decoupled: the set of slots a camp on `slot` occupies for its FO (itself + every slot it
// overlaps). Single source of truth for the overlapping condition — reused everywhere overlap matters.
const overlappingSlots = (slot: CampTimeSlot): CampTimeSlot[] => SLOT_OVERLAPS[slot] || [slot];

// is `roleId` (in camp field `field`) already committed (confirmed/live) to an overlapping slot that
// day? GLOBAL — field staff are shared, so a clash with any tenant's camp counts.
const isWorkerBooked = async (field: string, roleId: string, date: Date, timeSlot: CampTimeSlot, excludeCampId?: any): Promise<boolean> => {
    const where: any = {
        [field]: toObjectId(roleId),
        status: { $in: FO_BOOKING_STATUSES },
        date: utcDayRange(date),
        timeSlot: { $in: overlappingSlots(timeSlot) },
    };
    if (excludeCampId) {
        where._id = { $ne: excludeCampId };
    }
    const clash = await CampModel.exists(where);
    return Boolean(clash);
};

// throwing wrapper for write paths — 409 when the worker is already booked on an overlapping slot.
const assertWorkerFree = async (
    worker: FieldWorker,
    roleId: string,
    date: Date,
    timeSlot: CampTimeSlot,
    excludeCampId?: any,
): Promise<void> => {
    if (await isWorkerBooked(worker.field, roleId, date, timeSlot, excludeCampId)) {
        return throwAppError(`The ${worker.label} is already booked on another camp on this date and time slot`, StatusCodes.CONFLICT);
    }
};

// max span (in days) allowed for a single booking-availability query — the requested range may not
// exceed this. Keeps the one camp fetch bounded.
const MAX_AVAILABILITY_RANGE_DAYS = 30;

// YYYY-MM-DD key for the UTC day a date falls on — the availability tree is keyed by this.
const dateKey = (date: Date | string | number): string => startOfUTCDay(date).toISOString().slice(0, 10);

// role ids of workers (in camp field `field`) booked (confirmed/live) on an overlapping slot that day.
// GLOBAL — clashes span all tenants.
const bookedWorkerIds = async (field: string, date: Date, timeSlot: CampTimeSlot, excludeCampId: any): Promise<string[]> => {
    const camps = await CampModel.find({
        _id: { $ne: excludeCampId },
        [field]: { $ne: null },
        status: { $in: FO_BOOKING_STATUSES },
        date: utcDayRange(date),
        timeSlot: { $in: overlappingSlots(timeSlot) },
    })
        .select(field)
        .lean();

    return camps.map((c: any) => c[field]?.toString()).filter(Boolean);
};

// nearest active profiles of a geo-profile type whose own coverage reaches the point. GLOBAL (field
// staff serve every tenant) — shared by auto-allocation and booking-availability.
const nearestProfiles = async (geoType: string, lng: number, lat: number, limit = 100): Promise<any[]> => {
    return geoProfileModel.aggregate([
        {
            $geoNear: {
                near: { type: 'Point', coordinates: [lng, lat] },
                distanceField: 'distance', // meters
                spherical: true,
                // hard outer cap — a mis-set coverageRadius can never pull in a far-away worker
                maxDistance: GEO_ALLOCATION_MAX_DISTANCE,
                query: { type: geoType, status: GEO_PROFILE_STATUS.ACTIVE },
            },
        },
        // keep only staff whose own coverage radius reaches the point (straight-line pre-filter —
        // road distance is always ≥ straight-line, so this never drops a road-eligible worker)
        { $match: { $expr: { $lte: ['$distance', '$coverageRadius'] } } },
        { $limit: limit },
        { $project: { role: 1, coordinates: 1, coverageRadius: 1, distance: 1 } },
    ]);
};

// device catalog items (InventoryMaster ids) a project's tests need — narrowed to DEVICES only.
// Empty ⇒ the project imposes no device requirement.
const projectRequiredDeviceItemIds = async (projectId: any): Promise<string[]> => {
    if (!projectId) {
        return [];
    }
    const project: any = await Project.findById(projectId).select('tests').lean();
    const testIds: any[] = project?.tests || [];
    if (!testIds.length) {
        return [];
    }
    const tests = await TestMasterModel.find({ _id: { $in: testIds } })
        .select('consumption')
        .lean();
    const itemIds = [
        ...new Set(tests.flatMap((test: any) => (test.consumption || []).map((line: any) => line.item?.toString()).filter(Boolean))),
    ];
    if (!itemIds.length) {
        return [];
    }
    const devices = await InventoryMasterModel.find({ _id: { $in: itemIds }, type: ITEM_TYPES.DEVICE })
        .select('_id')
        .lean();
    return devices.map((device: any) => device._id.toString());
};

// Among candidate role ids, return the subset that holds EVERY required device as an operational
// (status 'assigned') in-hand unit. One batched read. Shared by auto-allocation and booking-
// availability so both apply the identical device gate. Call only when requiredDeviceItems is non-empty.
const rolesHoldingAllDevices = async (roleIds: any[], requiredDeviceItems: string[]): Promise<Set<string>> => {
    const qualified = new Set<string>();
    if (!roleIds.length || !requiredDeviceItems.length) {
        return qualified;
    }
    // one batched read of the candidates' assigned devices → roleId → set of device catalog-item ids
    const assignments = await InventoryAssignmentModel.find({
        assignee: { $in: roleIds },
        inventoryType: 'InventoryDevice',
    })
        .populate({ path: 'inventory', select: 'item status' })
        .lean();

    const heldByRole = new Map<string, Set<string>>();
    for (const assignment of assignments) {
        const roleId = assignment.assignee?.toString();
        const device = assignment.inventory as any;
        const itemId = device?.item?.toString();
        // only an operational, in-hand unit counts — a lost/damaged/maintenance (or not-yet-received)
        // device doesn't actually equip the worker for the camp.
        if (!roleId || !itemId || device?.status !== INVENTORY_DEVICE_STATUS.ASSIGNED) {
            continue;
        }
        if (!heldByRole.has(roleId)) {
            heldByRole.set(roleId, new Set());
        }
        heldByRole.get(roleId)!.add(itemId);
    }

    // a role qualifies only if it holds ALL required device catalog-items
    for (const roleId of roleIds.map((r) => r.toString())) {
        const held = heldByRole.get(roleId);
        if (held && requiredDeviceItems.every((itemId) => held.has(itemId))) {
            qualified.add(roleId);
        }
    }
    return qualified;
};

// Among candidate geo-profiles (already free + equipped, straight-line ordered), keep those within
// their coverage radius by actual ROAD distance and return the nearest one's role — one matrix call.
// Falls back to the straight-line nearest on a maps outage (profiles are already distance-ordered) so
// allocation isn't blocked by a transient failure; 422 if the maps lookup succeeds but none are
// road-reachable within coverage.
const pickNearestByRoad = async (profiles: any[], lat: number, lng: number, worker: FieldWorker): Promise<any> => {
    const candidates = profiles
        .map((p: any) => {
            const coords = p.coordinates as number[] | undefined;
            if (!p.role || !coords || coords.length !== 2) {
                return null;
            }
            // geoProfile coordinates are GeoJSON [lng, lat]
            return { role: p.role, lat: Number(coords[1]), lng: Number(coords[0]), coverageRadius: Number(p.coverageRadius ?? 0) };
        })
        .filter(Boolean) as { role: any; lat: number; lng: number; coverageRadius: number }[];

    // no usable coordinates to refine by — fall back to the straight-line nearest
    if (!candidates.length) {
        return profiles[0]?.role;
    }

    let distances;
    try {
        distances = await mapsManager
            .get(GOOGLE_MAPS)
            .computeDistanceMatrix({ lat, lng }, candidates.map((c) => ({ lat: c.lat, lng: c.lng })));
    } catch {
        return profiles[0]?.role;
    }

    const within = candidates
        .map((c, i) => ({ role: c.role, distance: distances[i]?.distanceMeters ?? Infinity, coverageRadius: c.coverageRadius }))
        .filter((c) => c.distance <= c.coverageRadius)
        .sort((a, b) => a.distance - b.distance);

    if (!within.length) {
        return throwAppError(`No ${worker.label} is within road-distance coverage of this camp`, StatusCodes.UNPROCESSABLE_ENTITY);
    }
    return within[0]?.role;
};

// nearest worker of `worker`'s kind within coverage, not already booked that day. 422/409 on failure.
const resolveNearestFreeWorker = async (camp: HydratedDocument<ICamp>, worker: FieldWorker, ctx: RequestContext): Promise<any> => {
    const coordinates = (camp.location as any)?.coordinates as number[] | undefined;
    if (!coordinates || coordinates.length !== 2) {
        return throwAppError('Camp has no location coordinates to allocate from', StatusCodes.UNPROCESSABLE_ENTITY);
    }

    const lng = coordinates[0] as number;
    const lat = coordinates[1] as number;
    const items = await nearestProfiles(worker.geoType, lng, lat, 100);
    if (!items.length) {
        return throwAppError(`No ${worker.label} covers this camp location`, StatusCodes.UNPROCESSABLE_ENTITY);
    }

    // nearest workers (distance order) not already booked on this date + overlapping slot
    const booked = await bookedWorkerIds(worker.field, camp.date, (camp as any).timeSlot, camp._id);
    let freeProfiles = items.filter((profile: any) => !booked.includes(profile.role?.toString()));
    if (!freeProfiles.length) {
        return throwAppError(`All ${worker.label}s near this camp are already booked on this date and time slot`, StatusCodes.CONFLICT);
    }

    // device gate — narrow to workers who hold every device the project's tests need. No requirement ⇒
    // any free worker qualifies.
    const requiredDeviceItems = await projectRequiredDeviceItemIds(camp.project);
    if (requiredDeviceItems.length) {
        const qualified = await rolesHoldingAllDevices(freeProfiles.map((profile: any) => profile.role), requiredDeviceItems);
        freeProfiles = freeProfiles.filter((profile: any) => qualified.has(profile.role?.toString()));
        if (!freeProfiles.length) {
            return throwAppError(`No nearby ${worker.label} holds all the devices this project requires`, StatusCodes.CONFLICT);
        }
    }

    // ROAD precision — among the qualified free workers, keep those within their coverage radius by
    // actual road distance and pick the nearest by road.
    return pickNearestByRoad(freeProfiles, lat, lng, worker);
};

// validate a supplied override: the role must exist and be the worker's role type. GLOBAL lookup
// (field staff are platform staff, never in a customer caller's tenant).
const assertWorkerRole = async (roleId: string, worker: FieldWorker): Promise<void> => {
    const role: any = await RoleModel.findById(roleId).populate('type');
    if (!role) {
        return throwAppError('The selected role was not found', StatusCodes.NOT_FOUND);
    }
    if (role.type?.code !== worker.roleTypeCode) {
        return throwAppError(`The selected role is not a ${worker.label}`, StatusCodes.BAD_REQUEST);
    }
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
    // the worker this camp uses, from its effective type (a type change in this same payload wins).
    const effectiveType = model.type ?? entity.type;
    const worker = workerFor(effectiveType);

    // assignee (fo/dietitian) + date are the booking key — only editable while `requested`
    if (entity.status !== CAMP_STATUSES.REQUESTED) {
        const supplied = model[worker.field];
        const changingAssignee = supplied && supplied !== (entity as any)[worker.field]?.toString();
        const changingDate = model.date && new Date(model.date).getTime() !== entity.date?.getTime();
        if (changingAssignee || changingDate) {
            return throwAppError(
                `The ${worker.label} and date can only be changed while the camp is in the requested stage`,
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

    // worker override — only the field matching the camp's type is accepted; the other kind is rejected.
    const otherWorker = worker === FO_WORKER ? DIETITIAN_WORKER : FO_WORKER;
    if (model[otherWorker.field]) {
        return throwAppError(
            `This camp is staffed by a ${worker.label}; the ${otherWorker.label} field does not apply`,
            StatusCodes.BAD_REQUEST,
        );
    }
    if (model[worker.field]) {
        await assertWorkerRole(model[worker.field], worker);
        (entity as any)[worker.field] = model[worker.field];
    }
    // mr is the only pharma-chain ref accepted; asm/rsm are derived from it (reset when the MR changes)
    if (model.mr) {
        const { mr, asm, rsm } = await resolveMrChain(model.mr, ctx);
        entity.mr = mr._id;
        entity.asm = asm?._id ?? null;
        entity.rsm = rsm?._id ?? null;
    }

    if (model.type) {
        entity.type = model.type;
    }
    if (model.billingType) {
        entity.billingType = model.billingType;
    }
    if (model.patientExpectation !== undefined) {
        entity.patientExpectation = model.patientExpectation;
    }

    if (model.date) {
        entity.date = model.date;
    }
    if (model.timeSlot) {
        (entity as any).timeSlot = model.timeSlot;
    }
    // location is replaced wholesale (validated as a full object in the validators)
    if (model.location) {
        entity.location = model.location;
    }

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
    if (model.notes !== undefined) {
        entity.notes = model.notes;
    }
    if (model.conscentPath !== undefined) {
        entity.conscentPath = model.conscentPath;
    }
    // free-form metadata bag (e.g. a void camp's mailUrl)
    if (model.meta !== undefined) {
        entity.meta = model.meta;
    }

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
    if (filters.code) {
        where.code = { $regex: filters.code, $options: 'i' };
    }
    if (filters.project) {
        where.project = filters.project;
    }
    if (filters.division) {
        where.division = filters.division;
    }
    if (filters.doctor) {
        where.doctor = filters.doctor;
    }
    if (filters.fo) {
        where.fo = filters.fo;
    }
    if (filters.dietitian) {
        where.dietitian = filters.dietitian;
    }
    if (filters.status) {
        where.status = filters.status;
    }
    if (filters.type) {
        where.type = filters.type;
    }
    if (filters.billingType) {
        where.billingType = filters.billingType;
    }
    if (filters.city) {
        where['location.city'] = { $regex: filters.city, $options: 'i' };
    }
    if (filters.state) {
        where['location.state'] = { $regex: filters.state, $options: 'i' };
    }
    // date range — dateTo is snapped to end-of-day (UTC) so the whole end day is included
    if (filters.dateFrom || filters.dateTo) {
        where.date = {};
        if (filters.dateFrom) {
            where.date.$gte = filters.dateFrom;
        }
        if (filters.dateTo) {
            where.date.$lte = endOfUTCDay(filters.dateTo);
        }
    }

    const countPromise = CampModel.countDocuments(where);
    const dataPromise = CampModel.find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    //  optional report — per-camp patient counts (from screenings) for this page, one batched aggregate
    const stats = filters.report === 'true' ? await getCampPatientStats(items) : undefined;

    return { count, items, stats };
};

// a top-level summary of the caller's own camps — total + counts by status and by type. Computed over
// the same own-scoped set (not the current page/filters), so it's a stable header for the "my camps"
// view. One aggregate, single collection scan.
const getMyCampSummary = async (ctx: RequestContext) => {
    const where: any = { ...ctx.where() };
    applyOwnScope(where, ctx);

    const [result] = await CampModel.aggregate([
        { $match: where },
        {
            $facet: {
                totalCamps: [{ $count: 'count' }],
                statusCounts: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
                typeCounts: [{ $group: { _id: '$type', count: { $sum: 1 } } }],
            },
        },
    ]);

    return {
        totalCamps: result?.totalCamps?.[0]?.count || 0,
        statusCounts: (result?.statusCounts || []).map((s: any) => ({ status: s._id, count: s.count })),
        typeCounts: (result?.typeCounts || []).map((t: any) => ({ type: t._id, count: t.count })),
    };
};

// "my camps" — field-force (FO / dietitian / MR) list only the camps assigned to them. Thin wrapper
// over search: these are all non-manage roles, so applyOwnScope pins the result to the caller's own
// slot (fo/dietitian/mr = their role id). Always includes per-camp patient stats (report=true) plus a
// top-level summary (total + status/type counts) over all the caller's camps.
const myCamps = async (filters: ISearchCampQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const [result, summary] = await Promise.all([
        search({ ...filters, report: 'true' }, ctx, options),
        getMyCampSummary(ctx),
    ]);
    return { ...result, summary };
};

// per-camp patient counts from the screenings collection — one screening = one patient at that camp
// (unique per tenant,patient,camp). The camp ids come from the already-scoped search page, and a
// screening's camp is within the same tenant, so a plain $in can't leak another tenant's screenings.
const getCampPatientStats = async (camps: HydratedDocument<ICamp>[]): Promise<Record<string, CampStats>> => {
    const campIds = camps.map((c) => c._id);
    const stats: Record<string, CampStats> = {};
    for (const id of campIds) {
        stats[id.toString()] = { patients: 0, patientsCompleted: 0 };
    }
    if (!campIds.length) {
        return stats;
    }
    const groups = await ScreeningModel.aggregate([
        { $match: { camp: { $in: campIds } } },
        {
            $group: {
                _id: '$camp',
                patients: { $sum: 1 },
                patientsCompleted: {
                    $sum: { $cond: [{ $eq: ['$status', SCREENING_STATUS.COMPLETED] }, 1, 0] },
                },
            },
        },
    ]);
    for (const g of groups) {
        const entry = stats[g._id?.toString()];
        if (entry) {
            entry.patients = g.patients;
            entry.patientsCompleted = g.patientsCompleted;
        }
    }
    return stats;
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
        // the camp's type must be one the project offers (project.type is an array of offerings)
        const campType = model.type ?? CAMP_TYPES.SCREENING;
        if (!((projectDoc.type as string[]) || []).includes(campType)) {
            return throwAppError(`This project does not offer ${campType} camps`, StatusCodes.BAD_REQUEST);
        }
        project = projectDoc._id;
        divisionId = projectDoc.division;
    }

    //3: build entity (tenant from the validated division) + apply the rest via set()
    const entity = new CampModel({ tenant: division.tenant, division: divisionId, project });
    let camp = await set(model, entity, ctx);

    // the worker this camp is staffed by, decided by its type
    const worker = workerFor(camp.type);

    //3b: a caller-supplied worker must be free for this camp's date + slot (overlap-aware). Hard 409.
    if ((camp as any)[worker.field]) {
        await assertWorkerFree(worker, (camp as any)[worker.field].toString(), camp.date, (camp as any).timeSlot, camp._id);
    }

    //4: best-effort auto-assign the nearest free worker when none supplied; on failure the camp stays
    // requested with no assignee (moveStage then blocks it leaving requested).
    if (!(camp as any)[worker.field]) {
        try {
            const role = await resolveNearestFreeWorker(camp, worker, ctx);
            camp = await set({ [worker.field]: role.toString() }, camp, ctx);
        } catch (error: any) {
            ctx.logger.warn({ err: error }, `No ${worker.label} could be auto-allocated; camp stays in requested with no assignee`);
        }
    }

    //4b: with a worker on the camp (already known free) auto-confirm, recording the transition.
    if ((camp as any)[worker.field]) {
        const actorName = `${ctx.user?.firstName || ''} ${ctx.user?.lastName || ''}`.trim();
        camp.stageHistory.push({
            from: CAMP_STATUSES.REQUESTED,
            to: CAMP_STATUSES.CONFIRMED,
            reason: `Auto-confirmed on ${worker.label} allocation`,
            actor: {
                roleId: ctx.role?._id || ctx.role?.id,
                name: actorName || undefined,
                email: ctx.user?.email,
            },
        } as any);
        camp.status = CAMP_STATUSES.CONFIRMED;
    }

    //5: reserve the sequential code + persist in a txn ($geoNear above stays outside the txn)
    const saved = await withTransaction(async () => {
        camp.code = await CounterService.next(CAMP_COUNTER_ENTITY, ctx);
        return await camp.save();
    });

    return saved;
};

// voidCamp — internal-team record of a camp that happened WITHOUT a PO (WF-4). Deliberately skips
// the whole create() lifecycle: no FO auto-allocation, no slot-clash check, no auto-confirm. The camp
// lands in `requested` (model default) with billingType forced to 'void', to be reconciled later
// (upline approval → PO mapped → flipped to billable). Same tenant/division/project validation as create.
const voidCamp = async (model: IVoidCampPayload, ctx: RequestContext): Promise<HydratedDocument<ICamp>> => {
    //1: division must exist (scoped) and belong to the selected client (tenant)
    const division = await DivisionService.get(model.division, ctx);
    if (!division) {
        return throwAppError('Division not found', StatusCodes.NOT_FOUND);
    }
    if (division.tenant.toString() !== model.tenant) {
        return throwAppError('The selected division does not belong to the selected client', StatusCodes.BAD_REQUEST);
    }

    //2: optional project link — when linked it must belong to the same client; its division wins, and
    // the camp's type must be one the project offers (same rules as create)
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
        const campType = model.type ?? CAMP_TYPES.SCREENING;
        if (!((projectDoc.type as string[]) || []).includes(campType)) {
            return throwAppError(`This project does not offer ${campType} camps`, StatusCodes.BAD_REQUEST);
        }
        project = projectDoc._id;
        divisionId = projectDoc.division;
    }

    //3: build + apply fields via set(). set() validates a supplied worker role but does NOT run the
    // slot-clash check (that lives in create()) — exactly what we want for a historical void camp.
    const entity = new CampModel({ tenant: division.tenant, division: divisionId, project });
    let camp = await set(model, entity, ctx);

    //4: force the void billing type — a void camp is never accepted as billable at creation.
    camp.billingType = BILLING_TYPES.VOID;

    //5: NO auto-allocation / auto-confirm — the camp stays `requested` (model default). Reserve the
    // sequential code + persist in a txn.
    const saved = await withTransaction(async () => {
        camp.code = await CounterService.next(CAMP_COUNTER_ENTITY, ctx);
        return await camp.save();
    });

    return saved;
};

// approveVoidCamp — the single update a void camp allows: approve it, moving requested → closed.
// Void camps use ONLY requested + closed (not the normal requested→confirmed→live→closed machine),
// so this handles that requested→closed transition directly. Route-gated to camp:manage. The approver
// and time are captured by the stageHistory entry's actor + createdAt (no separate approvedBy/At fields).
const approveVoidCamp = async (id: string, model: IApproveVoidCampPayload, ctx: RequestContext) => {
    let camp = await CampService.get(id, ctx);
    if (!camp) {
        return throwAppError('Camp not found', StatusCodes.NOT_FOUND);
    }

    // only a void camp can be approved through this path
    if (camp.billingType !== BILLING_TYPES.VOID) {
        return throwAppError('This camp is not a void camp', StatusCodes.BAD_REQUEST);
    }

    // a void camp can only be approved from `requested` → `closed`
    if (camp.status !== CAMP_STATUSES.REQUESTED) {
        return throwAppError('Only a requested void camp can be approved', StatusCodes.CONFLICT);
    }

    const actorName = `${ctx.user?.firstName || ''} ${ctx.user?.lastName || ''}`.trim();
    camp.stageHistory.push({
        from: CAMP_STATUSES.REQUESTED,
        to: CAMP_STATUSES.CLOSED,
        reason: model.reason,
        actor: {
            roleId: ctx.role?._id || ctx.role?.id,
            name: actorName || undefined,
            email: ctx.user?.email,
        },
    } as any);
    camp.status = CAMP_STATUSES.CLOSED;
    camp = await camp.save();

    return camp;
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

    // assignee/date/slot can all change here — the assigned worker must stay free for the (possibly
    // new) date + slot (overlap-aware). Hard 409. Excludes this camp from the check.
    const worker = workerFor(camp.type);
    if ((camp as any)[worker.field]) {
        await assertWorkerFree(worker, (camp as any)[worker.field].toString(), camp.date, (camp as any).timeSlot, camp._id);
    }

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

    // the worker this camp uses + its currently-assigned role id
    const worker = workerFor(camp.type);
    const assignee = (camp as any)[worker.field];

    // a camp cannot leave `requested` without its assigned worker (cancellation is exempt)
    const isCancel = to === CAMP_STATUSES.CANCELLED || to === CAMP_STATUSES.CANCELLED_CHARGED;
    if (from === CAMP_STATUSES.REQUESTED && !isCancel && !assignee) {
        return throwAppError(
            `A ${worker.label} must be assigned before this camp can leave the requested stage`,
            StatusCodes.UNPROCESSABLE_ENTITY,
        );
    }

    // a camp cannot be confirmed if its worker is already booked on another camp the same day AND slot
    if (to === CAMP_STATUSES.CONFIRMED && assignee) {
        const booked = await bookedWorkerIds(worker.field, camp.date, (camp as any).timeSlot, camp._id);
        if (booked.includes(assignee.toString())) {
            return throwAppError(`The ${worker.label} is already booked on another camp on this date and time slot`, StatusCodes.CONFLICT);
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

// manual/retry counterpart to create()'s auto-assign — allocates the worker the camp's type uses.
const allocateWorker = async (id: string, ctx: RequestContext) => {
    const camp = await CampService.get(id, ctx);
    if (!camp) {
        return throwAppError('Camp not found', StatusCodes.NOT_FOUND);
    }

    const worker = workerFor(camp.type);

    // (re)allocation is only allowed while `requested`; update() still backstops this.
    if (camp.status !== CAMP_STATUSES.REQUESTED) {
        return throwAppError(`A ${worker.label} can only be allocated while the camp is in the requested stage`, StatusCodes.CONFLICT);
    }

    const role = await resolveNearestFreeWorker(camp, worker, ctx);

    return CampService.update(id, { [worker.field]: role.toString() } as any, ctx);
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
    // only a LIVE project accepts bookings — a new/hold/closed project is not bookable (its state can
    // change later, so this is a conflict, not a permission denial). Pharma booking path only.
    if (project.status !== PROJECT_STATUS.LIVE) {
        return throwAppError('This project is not live and cannot be booked', StatusCodes.CONFLICT);
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
        location: model.location,
        devices: model.devices,
        notes: model.notes,
        conscentPath: model.conscentPath,
    };

    return CampService.create(createPayload, ctx);
};

const report = async (filters: ICampReportQuery, ctx: RequestContext) => {
    //1: single aggregation, single collection scan — every branch is independent, computed off the
    // same scoped input set. An optional `status` narrows the whole report (incl. byType) to one tab.
    const where: any = { ...ctx.where() };
    if (filters.status) {
        where.status = filters.status;
    }
    const [result] = await CampModel.aggregate([
        { $match: where },
        {
            $facet: {
                totalCamps: [{ $count: 'count' }],
                statusCounts: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
                typeCounts: [{ $group: { _id: '$type', count: { $sum: 1 } } }],
                billingTypeCounts: [{ $group: { _id: '$billingType', count: { $sum: 1 } } }],
            },
        },
    ]);

    return { ...result };
};

// booking availability — for a location + date range, report per-date/per-slot availability across
// the FOs who can service that location. A slot is available when at least one eligible FO is free
// for it; a date is available when at least one of its 4 slots is available.
const bookingAvailability = async (model: IBookingAvailabilityPayload, ctx: RequestContext) => {
    // customer (pharma) tenants only. The route already limits entry to camp:book holders, but a
    // god-mode / platform actor would otherwise slip past — availability is a pharma-facing check.
    if (ctx.tenant?.type !== TENANT_TYPE.CUSTOMER) {
        return throwAppError('Only customer-tenant users can check booking availability', StatusCodes.FORBIDDEN);
    }

    // the project must belong to the caller's tenant. ProjectService.get runs under ctx.where(), so a
    // project on any other tenant 404s — this enforces ctx.tenant === project.tenant without leaking a
    // foreign project's existence (for pharma it also honours the app-wide own-division visibility).
    const project = await ProjectService.get(model.projectID, ctx);
    if (!project) {
        return throwAppError('Project not found', StatusCodes.NOT_FOUND);
    }

    // explicit tenant-ownership assertion (defence-in-depth on top of the scoped read above): the
    // project's tenant must equal the caller's tenant, so a future change to ProjectService.get's
    // scoping can never silently open cross-tenant availability.
    const callerTenantId = (ctx.tenant?._id || ctx.tenant?.id)?.toString();
    if (project.tenant?.toString() !== callerTenantId) {
        return throwAppError('Project does not belong to your account', StatusCodes.FORBIDDEN);
    }

    // which field worker to report availability for — the caller states the camp type (a project can
    // be both screening and diet); defaults to screening → field-officer availability.
    const worker = workerFor(model.type);

    const { lat, lng } = model;
    const dateFrom = startOfUTCDay(model.dateFrom);
    const dateTo = startOfUTCDay(model.dateTo);

    //1: the requested range is capped — refuse anything wider than the allowed span
    if (dateTo < dateFrom) {
        return throwAppError('dateTo cannot be before dateFrom', StatusCodes.BAD_REQUEST);
    }
    const spanDays = Math.round((dateTo.getTime() - dateFrom.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    if (spanDays > MAX_AVAILABILITY_RANGE_DAYS) {
        return throwAppError(`The date range cannot exceed ${MAX_AVAILABILITY_RANGE_DAYS} days`, StatusCodes.BAD_REQUEST);
    }

    //2: eligible workers — nearest active workers (of the requested kind) whose OWN coverage radius
    // reaches the point (GLOBAL — field staff are platform staff, never tenant-scoped). The $geoNear
    // pre-filter uses straight-line distance; we then refine by ROAD distance below. Cap is high so a
    // dense area isn't silently truncated.
    const nearby = await nearestProfiles(worker.geoType, lng, lat, 500);

    //2a: a worker is eligible only if the ROAD distance from the camp point to their base is within
    // their coverage radius (straight-line already passed above). All road distances are fetched in a
    // SINGLE matrix call. If the maps lookup fails, fall back to the straight-line result (already
    // within coverage) so a transient maps outage doesn't zero out availability.
    // geoProfile coordinates are GeoJSON [lng, lat].
    const candidates = nearby
        .map((p: any) => {
            const roleId = p.role?.toString();
            const coords = p.coordinates as number[] | undefined;
            if (!roleId || !coords || coords.length !== 2) {
                return null;
            }
            return { roleId, lat: Number(coords[1]), lng: Number(coords[0]), coverageRadius: Number(p.coverageRadius ?? 0) };
        })
        .filter(Boolean) as { roleId: string; lat: number; lng: number; coverageRadius: number }[];

    let eligibleIds: string[] = [];
    if (candidates.length) {
        try {
            const distances = await mapsManager
                .get(GOOGLE_MAPS)
                .computeDistanceMatrix({ lat, lng }, candidates.map((c) => ({ lat: c.lat, lng: c.lng })));
            eligibleIds = candidates
                .filter((c, i) => (distances[i]?.distanceMeters ?? Infinity) <= c.coverageRadius)
                .map((c) => c.roleId);
        } catch {
            eligibleIds = candidates.map((c) => c.roleId);
        }
    }

    //2b: device gate — narrow the eligible workers to those who hold EVERY device the project's tests
    // require (operational 'assigned' units only). Mirrors the allocation gate in resolveNearestFreeWorker
    // so availability never shows a worker that booking/allocation would later reject. No requirement ⇒
    // no narrowing.
    const requiredDeviceItems = await projectRequiredDeviceItemIds(project._id || (project as any).id);
    if (requiredDeviceItems.length && eligibleIds.length) {
        const qualified = await rolesHoldingAllDevices(eligibleIds, requiredDeviceItems);
        eligibleIds = eligibleIds.filter((id) => qualified.has(id));
    }

    //3: pull the confirmed/live camps for those workers across the whole range in one query, then build
    // the tree: date -> slot -> Set(blocked role ids). Only workers that actually have a camp appear here.
    const tree = new Map<string, Map<CampTimeSlot, Set<string>>>();

    if (eligibleIds.length) {
        // NOT tenant-scoped: a worker booked (confirmed/live) by ANY pharma tenant is unavailable to
        // every other tenant, so availability must consider that worker's camps across all tenants. Only
        // per-slot booleans are returned, so no cross-tenant camp detail leaks.
        const camps = await CampModel.find({
            [worker.field]: { $in: eligibleIds },
            status: { $in: FO_BOOKING_STATUSES },
            date: { $gte: dateFrom, $lte: endOfUTCDay(dateTo) },
        })
            .select(`${worker.field} date timeSlot`)
            .lean();

        for (const camp of camps) {
            const roleId = (camp as any)[worker.field]?.toString();
            if (!roleId) {
                continue;
            }
            const key = dateKey((camp as any).date);
            const slot = (camp as any).timeSlot as CampTimeSlot;
            // a camp blocks its worker for every slot it overlaps (daytime slots block each other)
            const overlaps = overlappingSlots(slot);

            let slotMap = tree.get(key);
            if (!slotMap) {
                slotMap = new Map();
                tree.set(key, slotMap);
            }
            for (const overlappingSlot of overlaps) {
                let blocked = slotMap.get(overlappingSlot);
                if (!blocked) {
                    blocked = new Set();
                    slotMap.set(overlappingSlot, blocked);
                }
                blocked.add(roleId);
            }
        }
    }

    //4: only report the slots this project actually offers (project.campTimeSlots). Fall back to all
    // bookable slots if a project has none configured.
    const configuredSlots = (project.campTimeSlots as CampTimeSlot[]) || [];
    const projectSlots: CampTimeSlot[] = configuredSlots.length ? configuredSlots : ALL_SLOTS;

    //5: walk EVERY date in the range (not just dates that have camps) and evaluate the project's slots.
    // dates is a MAP keyed by the YYYY-MM-DD day → { available, slots }, for O(1) lookup by date.
    const dates: Record<string, { available: boolean; slots: Record<string, boolean> }> = {};
    for (let cursor = new Date(dateFrom); cursor <= dateTo; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
        const key = dateKey(cursor);
        const slotMap = tree.get(key);

        // slots keyed by timing → boolean availability (available when at least one eligible FO is
        // NOT blocked on that slot)
        const slots: Record<string, boolean> = {};
        for (const slot of projectSlots) {
            const blocked = slotMap?.get(slot);
            slots[slot] = eligibleIds.some((id) => !blocked || !blocked.has(id));
        }

        // a date is available if any of its offered slots is available
        const available = Object.values(slots).some(Boolean);
        dates[key] = { available, slots };
    }

    return {
        // count of eligible workers of the requested kind (field officers by default, or dietitians)
        eligibleFoCount: eligibleIds.length,
        dateFrom,
        dateTo,
        dates,
    };
};

export const CampService = {
    get,
    search,
    myCamps,
    create,
    voidCamp,
    approveVoidCamp,
    update,
    moveStage,
    allocateWorker,
    book,
    report,
    bookingAvailability,
    // exposed so the camp-day flow (screening/test) resolves the camp's worker kind (FO/dietitian)
    // from the same single branch, instead of duplicating the diet-vs-screening decision.
    workerFor,
};
