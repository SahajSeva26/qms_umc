// File Service
import mongoose, { HydratedDocument } from 'mongoose';
import { FileModel, IFile } from './file.model';
import {
    IChangeFileStatusPayload,
    ICreateFilePayload,
    ISearchFileQuery,
    IUpdateFilePayload,
} from './file.validators';
import {
    ENTITY_RELATION,
    FILE_PERMISSIONS,
    FILE_STATUS,
    FILE_TRANSITION_MAP,
} from './file.constants';
import { throwAppError } from '../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../shared/utils/strings';
import { IServiceOptions } from '../../shared/types/service.types';
import { TENANT_TYPE } from '../access-management/tenant/tenant.constants';
import { TenantService } from '../access-management/tenant/tenant.service';

type FileDocument = HydratedDocument<IFile> | null;

// File is tenant-scoped — every read starts from ctx.where() so a customer can only ever see
// its own tenant's files, and a forged id from another tenant 404s instead of leaking.
const populate: any[] = [
    { path: 'tenant', select: 'name code' },
    { path: 'owner', select: 'name code' },
];

// ========================================================================================
// HELPERS
// ========================================================================================

// Files are registered by internal (platform) roles on behalf of a tenant, so the tenant comes
// from the payload. A customer user can only ever create within their own tenant, so we ignore
// whatever they send and pin it to their context tenant.
const resolveTenant = async (model: ICreateFilePayload, ctx: RequestContext): Promise<string> => {
    if (ctx.tenant?.type === TENANT_TYPE.CUSTOMER) {
        return (ctx.tenant?._id || ctx.tenant?.id)?.toString();
    }
    if (!model.tenant) {
        return throwAppError('Tenant is required', StatusCodes.BAD_REQUEST);
    }
    const tenant = await TenantService.get(model.tenant, ctx);
    if (!tenant) {
        return throwAppError('Tenant not found', StatusCodes.NOT_FOUND);
    }
    return (tenant._id || tenant.id)?.toString();
};

// The relation must be one the entity type actually declares (e.g. a `user` file can only be a
// `profile_picture`, a `tenant` file a `logo`). Guards against attaching a logo to a user record.
const assertRelationCoherent = (type: string, relation: string) => {
    const group = (ENTITY_RELATION as any)[type];
    const allowed: string[] = group ? Object.values(group) : [];
    if (!allowed.includes(relation)) {
        return throwAppError(
            `Relation "${relation}" is not valid for entity type "${type}"`,
            StatusCodes.BAD_REQUEST,
        );
    }
};

// The acting role owns the file. ctx.role is the populated role doc; ctx.user.role is its id.
const resolveOwner = (ctx: RequestContext): string => {
    const owner = (ctx.role?._id || ctx.user?.role)?.toString();
    if (!owner) {
        return throwAppError('Unable to resolve the owning role', StatusCodes.UNAUTHORIZED);
    }
    return owner;
};

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

// Only presentational metadata is mutable here — entity, content (except displayName), tenant,
// owner and status are all seeded/moved elsewhere and intentionally ignored.
const set = (model: any, entity: HydratedDocument<IFile>) => {
    if (model.displayName && entity.content) {
        entity.content.displayName = model.displayName;
    }
    if (model.tags) {
        entity.tags = model.tags;
    }
    return entity;
};

const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<FileDocument> => {
    if (!isValidObjectID(id)) {
        return null;
    }

    const where: mongoose.QueryFilter<IFile> = { ...ctx.where(), _id: id };

    let query = FileModel.findOne(where);
    if (options?.populate) {
        query = query.populate(populate);
    }

    return await query;
};

const search = async (filters: ISearchFileQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { createdAt: -1 };

    //1: default scoping — platform sees all, customer pinned to own tenant (ctx.where)
    const where: mongoose.QueryFilter<IFile> = { ...ctx.where() };

    //2: platform staff may narrow to a specific tenant's files; the filter is ignored for
    // customer users so they can never read another tenant's files.
    if (filters.tenant && ctx.tenant?.type === TENANT_TYPE.PLATFORM) {
        where.tenant = filters.tenant;
    }

    //3: status visibility — discarded (soft-deleted) files are hidden unless a file:manage actor
    // explicitly asks for them; everyone else's status filter is honoured as-is.
    const canManage = ctx.hasAnyPermissions([FILE_PERMISSIONS.MANAGE.code]);
    if (filters.status && (filters.status !== FILE_STATUS.DISCARDED || canManage)) {
        where.status = filters.status;
    } else {
        where.status = { $ne: FILE_STATUS.DISCARDED };
    }

    //4: search filters
    if (filters.entityId) {
        where['entity.id'] = filters.entityId;
    }
    if (filters.entityType) {
        where['entity.type'] = filters.entityType;
    }
    if (filters.relation) {
        where['entity.relation'] = filters.relation;
    }
    if (filters.type) {
        where.type = filters.type;
    }
    if (filters.owner) {
        where.owner = filters.owner;
    }
    if (filters.tag) {
        where.tags = filters.tag;
    }

    //5: execute count + data together
    const countPromise = FileModel.countDocuments(where);
    const dataPromise = FileModel.find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

const create = async (model: ICreateFilePayload, ctx: RequestContext): Promise<HydratedDocument<IFile>> => {
    //1: resolve the owning tenant (explicit + existence-checked for platform, own-tenant for customer)
    const tenant = await resolveTenant(model, ctx);

    //2: coherence — the relation must be valid for the entity type
    assertRelationCoherent(model.entity.type, model.entity.relation);

    //3: the acting role owns the file
    const owner = resolveOwner(ctx);

    //4: build entity — tenant, owner, entity ref and content (immutable) are seeded here; status
    // defaults to DRAFT on the model; only tags flow through set()
    const doc = new FileModel({
        tenant,
        owner,
        entity: {
            id: model.entity.id,
            type: model.entity.type,
            relation: model.entity.relation,
        },
        content: model.content,
        ...(model.type ? { type: model.type } : {}),
    });

    let file = set(model, doc);
    file = await file.save();

    return file;
};

const update = async (id: string, model: IUpdateFilePayload, ctx: RequestContext) => {
    //1: get first (scoped)
    let file = await FileService.get(id, ctx);
    if (!file) {
        return throwAppError('File not found', StatusCodes.NOT_FOUND);
    }

    //2: apply editable fields (entity/content-body/tenant/owner/status untouched here)
    file = set(model, file);
    file = await file.save();

    return file;
};

// Status moves through the FILE_TRANSITION_MAP state machine, never a free write. Discarded is
// terminal (empty transition list), so a discarded file can't be revived.
const changeStatus = async (id: string, model: IChangeFileStatusPayload, ctx: RequestContext) => {
    //1: get first (scoped)
    const file = await FileService.get(id, ctx);
    if (!file) {
        return throwAppError('File not found', StatusCodes.NOT_FOUND);
    }

    //2: no-op guard
    const current = file.status as keyof typeof FILE_TRANSITION_MAP;
    if (current === model.status) {
        return throwAppError(`File is already "${model.status}"`, StatusCodes.CONFLICT);
    }

    //3: validate the transition against the state machine
    const allowed: readonly string[] = FILE_TRANSITION_MAP[current] || [];
    if (!allowed.includes(model.status)) {
        return throwAppError(
            `Cannot move a file from "${current}" to "${model.status}"`,
            StatusCodes.CONFLICT,
        );
    }

    //4: apply + save
    file.status = model.status;
    return await file.save();
};

export const FileService = {
    get,
    search,
    create,
    update,
    changeStatus,
};
