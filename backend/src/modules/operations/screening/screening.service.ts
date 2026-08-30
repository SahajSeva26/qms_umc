// Screening Service
import mongoose, { HydratedDocument } from 'mongoose';
import { ScreeningModel, ScreeningDocument as IScreening } from './screening.model';
import {
    ICreateScreeningPayload,
    IMoveStagePayload,
    ISearchScreeningQuery,
    IUpdateScreeningPayload,
    IVerifyConsentPayload,
} from './screening.validators';
import { SCREENING_PERMISSIONS, SCREENING_STATUS, SCREENING_TRANSITION_MAP } from './screening.constants';
import { canTransition } from '../../crm/lead/lead.validators';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { IServiceOptions } from '../../../shared/types/service.types';
import { OtpHandler } from '../../../shared/utils/otp';
import { CampService } from '../camp/camp.service';
import { CAMP_STATUSES } from '../camp/camp.constants';
import { PatientService } from '../patient/patient.service';
import { ALLOWED_ROLETYPE_CODES } from '../../access-management/role-type/roleType.constants';

type ScreeningDoc = HydratedDocument<IScreening> | null;

const populate: any[] = [
    { path: 'tenant', select: 'name code' },
    { path: 'patient', select: 'code firstName middleName lastName mobile' },
    { path: 'camp', select: 'code date status city state' },
];

// ================================ HELPERS ================================

// A non-manage actor may only create/mutate a screening for a camp they are the assigned FO of:
// their role must be a field-officer type AND camp.fo must equal their role id. manage-level actors
// (screening:manage / system) bypass this restriction.
const assertAssignedFoOrManage = (camp: any, ctx: RequestContext) => {
    if (ctx.hasAnyPermissions([SCREENING_PERMISSIONS.MANAGE.code])) {
        return;
    }
    const isFoType = ctx.role?.type?.code === ALLOWED_ROLETYPE_CODES.PLATFORM.FIELD_OFFICER;
    // camp.fo may be a populated role doc or a raw ObjectId — normalise to an id before comparing
    const foId = camp?.fo?._id ?? camp?.fo;
    const isAssigned = foId && ctx.role?._id && foId.toString() === ctx.role._id.toString();
    if (!isFoType || !isAssigned) {
        return throwAppError('Only the field officer assigned to this camp can screen its patients', StatusCodes.FORBIDDEN);
    }
};

// Load the camp for a screening action and authorize the actor. Reuses CampService.get — which
// applies tenant + field-force scope AND populates fo — then asserts the actor is the assigned FO
// (or a manage actor). Shared by create + every mutation so the rule lives in one place (DRY).
const loadCampForAction = async (campId: any, ctx: RequestContext) => {
    const camp = await CampService.get(campId.toString(), ctx, { populate: true });
    if (!camp) {
        return throwAppError('Camp not found', StatusCodes.NOT_FOUND);
    }
    assertAssignedFoOrManage(camp, ctx);
    return camp;
};

// frozen snapshot of the acting role at the moment of a transition (mirrors camp/lead/etc.)
const actorSnapshot = (ctx: RequestContext) => {
    const name = `${ctx.user?.firstName || ''} ${ctx.user?.lastName || ''}`.trim();
    return {
        roleId: ctx.role?._id || ctx.role?.id,
        name: name || undefined,
        email: ctx.user?.email,
    };
};

// ================================ CORE FUNCTIONS ================================

// only symptoms + referral are editable through set(); patient/camp/tenant are pinned at create,
// consent flows through verifyConsent, and status flows through moveStage.
const set = async (model: any, entity: HydratedDocument<IScreening>, ctx: RequestContext) => {
    if (model.symptoms !== undefined) {
        entity.symptoms = model.symptoms;
    }
    if (model.referral !== undefined) {
        entity.referral = model.referral;
    }
    return entity;
};

const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<ScreeningDoc> => {
    const where: mongoose.QueryFilter<IScreening> = ctx.where();
    where._id = id;

    let query = ScreeningModel.findOne(where);
    if (options?.populate) {
        query = query.populate(populate);
    }

    return await query;
};

const search = async (filters: ISearchScreeningQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { createdAt: -1 };

    const where: mongoose.QueryFilter<IScreening> = { ...ctx.where() };

    // tenant filter (switch tenants) is only honoured for a screening:manage actor not already
    // tenant-pinned by ctx.where() — a scoped actor stays locked to their own tenant.
    if (filters.tenant && !where.tenant && ctx.hasAnyPermissions([SCREENING_PERMISSIONS.MANAGE.code])) {
        where.tenant = filters.tenant;
    }
    if (filters.patient) {
        where.patient = filters.patient;
    }
    if (filters.camp) {
        where.camp = filters.camp;
    }
    if (filters.status) {
        where.status = filters.status;
    }
    if (filters.referral !== undefined) {
        where.referral = filters.referral;
    }

    const countPromise = ScreeningModel.countDocuments(where);
    const dataPromise = ScreeningModel.find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

const create = async (model: ICreateScreeningPayload, ctx: RequestContext): Promise<HydratedDocument<IScreening>> => {
    //1: load the camp (reuses CampService.get — scope + populated fo) and authorize the actor as
    // the assigned FO (or manage). The screening inherits its tenant from the camp.
    const camp: any = await loadCampForAction(model.camp, ctx);

    // a screening can only start once the camp is live (i.e. actually running on the day)
    if (camp.status !== CAMP_STATUSES.LIVE) {
        return throwAppError('Screenings can only be created for a camp that is live', StatusCodes.CONFLICT);
    }

    //2: patient must exist (global registry)
    const patient = await PatientService.get(model.patient, ctx);
    if (!patient) {
        return throwAppError('Patient not found', StatusCodes.NOT_FOUND);
    }

    //3: one screening per patient per camp — reuse search instead of a bespoke findOne
    const { count } = await ScreeningService.search(
        { patient: patient._id.toString(), camp: camp._id.toString() },
        ctx,
    );
    if (count > 0) {
        return throwAppError('This patient has already been screened at this camp', StatusCodes.CONFLICT);
    }

    //4: build entity — tenant from camp, consent OTP generated server-side, seed the created entry
    const entity = new ScreeningModel({
        tenant: camp.tenant?._id ?? camp.tenant,
        patient: patient._id,
        camp: camp._id,
        consent: {
            otp: OtpHandler.generate(),
            signature: model.signature,
            verified: false,
        },
        status: SCREENING_STATUS.PENDING,
        stageHistory: [
            {
                to: SCREENING_STATUS.PENDING,
                reason: 'Screening created',
                actor: actorSnapshot(ctx),
            },
        ],
    });

    let screening = await set(model, entity, ctx);
    screening = await screening.save();

    return screening;
};

const update = async (id: string, model: IUpdateScreeningPayload, ctx: RequestContext) => {
    let screening = await ScreeningService.get(id, ctx);
    if (!screening) {
        return throwAppError('Screening not found', StatusCodes.NOT_FOUND);
    }

    // only the FO assigned to this screening's camp (or a manage actor) may mutate it
    await loadCampForAction(screening.camp, ctx);

    // a screening is only editable while pending; once completed/cancelled it is locked
    if (screening.status !== SCREENING_STATUS.PENDING) {
        return throwAppError('A screening can only be edited while it is pending', StatusCodes.CONFLICT);
    }

    screening = await set(model, screening, ctx);
    screening = await screening.save();

    return screening;
};

// moveStage is the ONLY path allowed to change a screening's status.
const moveStage = async (id: string, model: IMoveStagePayload, ctx: RequestContext) => {
    let screening = await ScreeningService.get(id, ctx);
    if (!screening) {
        return throwAppError('Screening not found', StatusCodes.NOT_FOUND);
    }

    // only the FO assigned to this screening's camp (or a manage actor) may move its stage
    await loadCampForAction(screening.camp, ctx);

    const from = screening.status as string;
    const to = model.to;

    if (from === to) {
        return throwAppError(`Screening is already in the '${to}' stage`, StatusCodes.BAD_REQUEST);
    }
    if (!canTransition(SCREENING_TRANSITION_MAP, from, to)) {
        return throwAppError(`Invalid stage transition from '${from}' to '${to}'`, StatusCodes.BAD_REQUEST);
    }

    // a screening cannot be completed until the patient's consent has been verified
    if (to === SCREENING_STATUS.COMPLETED && !screening.consent?.verified) {
        return throwAppError('Patient consent must be verified before completing the screening', StatusCodes.UNPROCESSABLE_ENTITY);
    }

    screening.stageHistory.push({
        from,
        to,
        reason: model.reason,
        actor: actorSnapshot(ctx),
    } as any);
    screening.status = to;
    screening = await screening.save();

    return screening;
};

// verify the patient's consent by matching the OTP against the stored one. An optional signature
// captured at the same time is stored alongside.
const verifyConsent = async (id: string, model: IVerifyConsentPayload, ctx: RequestContext) => {
    const screening = await ScreeningService.get(id, ctx);
    if (!screening) {
        return throwAppError('Screening not found', StatusCodes.NOT_FOUND);
    }

    // only the FO assigned to this screening's camp (or a manage actor) may verify consent
    await loadCampForAction(screening.camp, ctx);

    if (screening.consent?.verified) {
        return throwAppError('Consent has already been verified', StatusCodes.BAD_REQUEST);
    }
    if (!screening.consent || model.otp !== screening.consent.otp) {
        return throwAppError('Invalid consent OTP', StatusCodes.BAD_REQUEST);
    }

    screening.consent.verified = true;
    if (model.signature) {
        screening.consent.signature = model.signature;
    }

    return await screening.save();
};

export const ScreeningService = {
    get,
    search,
    create,
    update,
    moveStage,
    verifyConsent,
};
