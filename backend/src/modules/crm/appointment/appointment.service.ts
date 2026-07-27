// Appointment Service
import mongoose, { HydratedDocument } from 'mongoose';
import { AppointmentModel, IAppointment } from './appointment.model';
import {
    ICreateAppointmentPayload,
    IMoveStagePayload,
    IRespondPayload,
    ISearchAppointmentQuery,
    IUpdateAppointmentPayload,
} from './appointment.validators';
import {
    APPOINTMENT_COUNTER_ENTITY,
    APPOINTMENT_INVITE_STATUSES,
    APPOINTMENT_PERMISSIONS,
    APPOINTMENT_STATUSES,
    APPOINTMENT_TRANSITION_MAP,
    MOM_SUBMISSION_DEADLINE_HOURS,
} from './appointment.constants';
import { calculateWorkingExpiry } from '../../../shared/helpers/expiryHelper';
import { canTransition } from '../lead/lead.validators';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../../shared/utils/strings';
import { endOfUTCDay } from '../../../shared/utils/dates';
import { IServiceOptions } from '../../../shared/types/service.types';
import { withTransaction } from '../../../shared/helpers/transactionHelper';
import { CounterService } from '../../counter/counter.service';
import { DivisionService } from '../../division/division.service';
import { ContactService } from '../contact/contact.service';
import { LeadService } from '../lead/lead.service';
import { RoleService } from '../../access-management/role/role.service';

type AppointmentDocument = HydratedDocument<IAppointment> | null;

const populate: any[] = [
    { path: 'tenant', select: 'name code' },
    { path: 'division', select: 'name code therapy' },
    { path: 'salesPerson' },
    { path: 'contactPerson' },
    { path: 'internalMembers.role' },
    { path: 'lead', select: 'code title status' },
    { path: 'parent', select: 'code type status' },
];

// ========================================================================================
// HELPERS
// ========================================================================================

// a search-only actor (appointment:search, not appointment:manage) sees an appointment only if
// they own it (salesPerson) or attend it (internalMembers).
const applyOwnScope = (where: any, ctx: RequestContext) => {
    if (
        ctx.hasAnyPermissions([APPOINTMENT_PERMISSIONS.SEARCH.code]) &&
        !ctx.hasAnyPermissions([APPOINTMENT_PERMISSIONS.MANAGE.code])
    ) {
        where.$or = [{ salesPerson: ctx.role?._id }, { 'internalMembers.role': ctx.role?._id }];
    }
};

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

const set = async (model: any, entity: any, ctx: RequestContext): Promise<HydratedDocument<IAppointment>> => {
    // contactPerson must exist and belong to the appointment's own tenant (the pharma company).
    // entity.tenant is set before set() runs — derived from division on create, loaded doc on update.
    if (model.contactPerson) {
        const contact = await ContactService.get(model.contactPerson, ctx);
        if (!contact) {
            return throwAppError('Contact person not found', StatusCodes.NOT_FOUND);
        }
        if (contact.tenant?.toString() !== entity.tenant?.toString()) {
            return throwAppError('Contact person must belong to the selected company', StatusCodes.BAD_REQUEST);
        }
        entity.contactPerson = model.contactPerson;
    }

    // internalMembers — each referenced role must exist (scoped to the actor). Incoming role ids are
    // mapped into invite rows; an existing member's response (status/note) is preserved on re-save,
    // brand-new members start at pending. Members dropped from the list are removed.
    if (model.internalMembers) {
        const existing = new Map((entity.internalMembers || []).map((inv: any) => [inv.role.toString(), inv]));
        // dedupe incoming ids — the same role listed twice must not create two invite rows
        const roleIds: string[] = Array.from(new Set<string>(model.internalMembers.map((role: any) => String(role))));
        // validate every referenced role exists (scoped to the actor) in parallel
        const members = await Promise.all(roleIds.map((roleId) => RoleService.get(roleId, ctx)));
        const invites = roleIds.map((roleId, i) => {
            if (!members[i]) {
                return throwAppError('Internal member not found', StatusCodes.NOT_FOUND);
            }
            // preserve an existing member's response; brand-new members start at pending
            return existing.get(roleId) || { role: roleId, status: APPOINTMENT_INVITE_STATUSES.PENDING };
        });
        entity.internalMembers = invites;
    }

    // lead — optional (follow-up appointments); must belong to the same tenant
    if (model.lead) {
        const lead = await LeadService.get(model.lead, ctx);
        if (!lead) {
            return throwAppError('Lead not found', StatusCodes.NOT_FOUND);
        }
        if (lead.tenant?.toString() !== entity.tenant?.toString()) {
            return throwAppError('Lead must belong to the selected company', StatusCodes.BAD_REQUEST);
        }
        entity.lead = model.lead;
    }

    // classification & scheduling
    if (model.type) {
        entity.type = model.type;
    }
    if (model.mode) {
        entity.mode = model.mode;
    }
    if (model.destinationLink !== undefined) {
        entity.destinationLink = model.destinationLink;
    }

    if (model.startTime || model.endTime !== undefined) {
        entity.duration = entity.duration || ({} as any);
        if (model.startTime) {
            entity.duration.startTime = model.startTime;
        }
        if (model.endTime !== undefined) {
            entity.duration.endTime = model.endTime;
            // MoM submission deadline is derived from the meeting end — 24 working hours after it ends
            // (calculateWorkingExpiry skips nights/weekends). Recomputed here so it stays in sync
            // whenever endTime changes.
            entity.mom = entity.mom || ({} as any);
            entity.mom.submissionDeadline = calculateWorkingExpiry({
                startAt: model.endTime,
                deadlineHours: MOM_SUBMISSION_DEADLINE_HOURS,
            });
        }
    }

    if (model.agenda) {
        entity.agenda = entity.agenda || ({} as any);
        if (model.agenda.public !== undefined) {
            entity.agenda.public = model.agenda.public;
        }
        if (model.agenda.private !== undefined) {
            entity.agenda.private = model.agenda.private;
        }
    }

    // submissionDeadline is NOT set here — it is derived from endTime above. Only the MoM content is editable.
    if (model.mom) {
        // MoM cannot be captured while the appointment is blocked — the meeting is on hold.
        if (entity.status === APPOINTMENT_STATUSES.BLOCKED) {
            return throwAppError(
                'Minutes of meeting cannot be added while the appointment is blocked',
                StatusCodes.CONFLICT,
            );
        }
        entity.mom = entity.mom || ({} as any);
        if (model.mom.details !== undefined) {
            entity.mom.details = model.mom.details;
        }
    }

    if (model.nextSteps !== undefined) {
        entity.nextSteps = model.nextSteps;
    }

    return entity;
};

const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<AppointmentDocument> => {
    const where: mongoose.QueryFilter<IAppointment> = ctx.where();

    if (isValidObjectID(id)) {
        where._id = id;
    } else {
        where.code = id;
    }
    applyOwnScope(where, ctx);

    let query = AppointmentModel.findOne(where);

    if (options?.populate) {
        query = query.populate(populate);
    }

    return await query;
};

const search = async (filters: ISearchAppointmentQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { 'duration.startTime': -1 };

    //1: default scoping
    const where: mongoose.QueryFilter<IAppointment> = { ...ctx.where() };
    applyOwnScope(where, ctx);

    //2: add search filters
    if (filters.status) {
        where.status = filters.status;
    }
    if (filters.type) {
        where.type = filters.type;
    }
    if (filters.mode) {
        where.mode = filters.mode;
    }
    if (filters.division) {
        where.division = filters.division;
    }
    if (filters.lead) {
        where.lead = filters.lead;
    }
    if (filters.salesPerson) {
        where.salesPerson = filters.salesPerson;
    }
    if (filters.contactPerson) {
        where.contactPerson = filters.contactPerson;
    }
    // date range on the scheduled start time — dateTo snapped to end-of-day (UTC) so the whole day is included
    if (filters.dateFrom || filters.dateTo) {
        where['duration.startTime'] = {};
        if (filters.dateFrom) {
            where['duration.startTime'].$gte = filters.dateFrom;
        }
        if (filters.dateTo) {
            where['duration.startTime'].$lte = endOfUTCDay(filters.dateTo);
        }
    }

    //3: execute queries
    const countPromise = AppointmentModel.countDocuments(where);
    const dataPromise = AppointmentModel.find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

const create = async (model: ICreateAppointmentPayload, ctx: RequestContext): Promise<HydratedDocument<IAppointment>> => {
    //1: division must exist (scoped to the actor); the appointment inherits its tenant
    const division = await DivisionService.get(model.division, ctx);
    if (!division) {
        return throwAppError('Division not found', StatusCodes.NOT_FOUND);
    }

    //2: guard — the chosen division must belong to the selected tenant (catches mismatched selection)
    if (division.tenant.toString() !== model.tenant) {
        return throwAppError('Division does not belong to the selected company', StatusCodes.BAD_REQUEST);
    }

    //3: optional parent link — a follow-up chains to an earlier appointment of the same company
    let parent: any = null;
    if (model.parent) {
        const parentDoc = await AppointmentService.get(model.parent, ctx);
        if (!parentDoc) {
            return throwAppError('Parent appointment not found', StatusCodes.NOT_FOUND);
        }
        if (parentDoc.tenant?.toString() !== model.tenant) {
            return throwAppError('Parent appointment does not belong to the selected company', StatusCodes.BAD_REQUEST);
        }
        parent = parentDoc._id;
    }

    const appointment = await withTransaction(async () => {
        const code: string = await CounterService.next(APPOINTMENT_COUNTER_ENTITY, ctx);
        //4: build entity — tenant is derived from the division (the pharma company, source of truth).
        // salesPerson is auto-set to the creator (the owner). tenant must be set before set() so it can
        // validate contactPerson/lead against it.
        let entity = new AppointmentModel({
            tenant: division.tenant,
            division: division._id,
            salesPerson: ctx.role?._id || ctx.role?.id,
            parent,
            code,
        });

        //5: set validates + applies contactPerson/internalMembers/lead and the remaining fields
        entity = await set(model, entity, ctx);
        entity = await entity.save();
        return entity;
    });

    return appointment;
};

const update = async (id: string, model: IUpdateAppointmentPayload, ctx: RequestContext) => {
    //1: get appointment first (scoped)
    let appointment = await AppointmentService.get(id, ctx);
    if (!appointment) {
        return throwAppError('Appointment not found', StatusCodes.NOT_FOUND);
    }

    //2: apply editable fields (tenant/division/salesPerson/parent/status are not touched here)
    appointment = await set(model, appointment, ctx);
    appointment = await appointment.save();

    return appointment;
};

// moveStage is the ONLY path allowed to change an appointment's status.
const moveStage = async (id: string, model: IMoveStagePayload, ctx: RequestContext) => {
    //1: get appointment first (scoped)
    let appointment = await AppointmentService.get(id, ctx);
    if (!appointment) {
        return throwAppError('Appointment not found', StatusCodes.NOT_FOUND);
    }

    const from = appointment.status as string;
    const to = model.to;

    //2: guard — no-op move
    if (from === to) {
        return throwAppError(`Appointment is already in the '${to}' stage`, StatusCodes.BAD_REQUEST);
    }

    //3: guard — transition must be allowed
    if (!canTransition(APPOINTMENT_TRANSITION_MAP, from, to)) {
        return throwAppError(`Invalid stage transition from '${from}' to '${to}'`, StatusCodes.BAD_REQUEST);
    }

    //3b: releasing a blocked slot is manage-only — even tenant:manage (which the route allows for other
    // transitions) cannot do it; only appointment:manage.
    if (from === APPOINTMENT_STATUSES.BLOCKED && to === APPOINTMENT_STATUSES.RELEASED) {
        if (!ctx.hasAnyPermissions([APPOINTMENT_PERMISSIONS.MANAGE.code])) {
            return throwAppError('Only an appointment manager can release a blocked appointment', StatusCodes.FORBIDDEN);
        }
    }

    //4: append to the append-only journal + flip the cached status (one atomic save)
    // snapshot the actor's identity from the token so history stays true even if the user/role later changes
    const actorName = `${ctx.user?.firstName || ''} ${ctx.user?.lastName || ''}`.trim();
    (appointment.stageHistory as any).push({
        from,
        to,
        reason: model.reason,
        actor: {
            roleId: ctx.role?._id || ctx.role?.id,
            name: actorName || undefined,
            email: ctx.user?.email,
        },
    });
    appointment.status = to;
    appointment = await appointment.save();

    return appointment;
};

// respond is how an invited member sets their OWN rsvp (accepted/declined). The member is derived
// from the token (ctx.role), never the payload — nobody can respond on another member's behalf.
const respond = async (id: string, model: IRespondPayload, ctx: RequestContext) => {
    //1: get appointment first (scoped — own-scope lets an invited member reach it)
    let appointment = await AppointmentService.get(id, ctx);
    if (!appointment) {
        return throwAppError('Appointment not found', StatusCodes.NOT_FOUND);
    }

    //2: the actor must be an invited member — locate their own invite row
    const roleId = (ctx.role?._id || ctx.role?.id)?.toString();
    const invite = (appointment.internalMembers as any[]).find((inv) => inv.role?.toString() === roleId);
    if (!invite) {
        return throwAppError('You are not an invited member of this appointment', StatusCodes.FORBIDDEN);
    }

    //2b: RSVP only makes sense while the meeting is still planned — you cannot respond to one
    // that is already done, cancelled, blocked, or released.
    if (appointment.status !== APPOINTMENT_STATUSES.PLANNED) {
        return throwAppError(
            `You can only respond to a planned appointment (this one is '${appointment.status}')`,
            StatusCodes.CONFLICT,
        );
    }

    //3: record the response — the subdoc's updatedAt timestamps when they answered
    invite.status = model.status;
    if (model.note !== undefined) invite.note = model.note;
    appointment = await appointment.save();

    return appointment;
};

export const AppointmentService = {
    get,
    search,
    create,
    update,
    moveStage,
    respond,
};

// ========================================================================================
// EXPORTS
// ========================================================================================
