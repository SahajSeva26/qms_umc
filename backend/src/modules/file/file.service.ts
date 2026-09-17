// File Service
import mongoose, { HydratedDocument } from 'mongoose';
import { FileModel, IFile } from './file.model';
import { IAttachFilesPayload, IChangeFileStatusPayload, ICreateFilePayload, ISearchFileQuery, IUpdateFilePayload } from './file.validators';
import { ENTITY_RELATION, FILE_PERMISSIONS, FILE_STATUS, FILE_TRANSITION_MAP, FILE_TYPE, getRelationCap } from './file.constants';
import { throwAppError } from '../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../shared/utils/contextBuilder';
import { generateUUID, isValidObjectID } from '../../shared/utils/strings';
import { IServiceOptions } from '../../shared/types/service.types';
import { TENANT_TYPE } from '../access-management/tenant/tenant.constants';
import { TenantService } from '../access-management/tenant/tenant.service';
import { storageManager } from '../../shared/providers/storage/storage';
import { S3 } from '../../shared/providers/storage/aws/s3.provider';
import { logger } from '../../shared/utils/logger';
import { withTransaction } from '../../shared/helpers/transactionHelper';

type FileDocument = HydratedDocument<IFile> | null;

// Tenant-scoped: every read starts from ctx.where() so a customer can't read another tenant's files.
const populate: any[] = [
    { path: 'tenant', select: 'name code' },
    { path: 'owner', select: 'name code' },
];

// ========================================================================================
// HELPERS
// ========================================================================================

// A customer is pinned to their own tenant; a platform actor's (required, validator-enforced) tenant
// is existence-checked here.
const resolveTenant = async (model: ICreateFilePayload, ctx: RequestContext): Promise<string> => {
    if (ctx.tenant?.type === TENANT_TYPE.CUSTOMER) {
        return (ctx.tenant?._id || ctx.tenant?.id)?.toString();
    }
    const tenant = await TenantService.get(model.tenant, ctx);
    if (!tenant) {
        return throwAppError('Tenant not found', StatusCodes.NOT_FOUND);
    }
    return (tenant._id || tenant.id)?.toString();
};

// The relation must be one the entity type declares (e.g. user→profile_picture, tenant→logo).
const assertRelationCoherent = (type: string, relation: string) => {
    const group = (ENTITY_RELATION as any)[type];
    const allowed: string[] = group ? Object.values(group).map((r: any) => r.name) : [];
    if (!allowed.includes(relation)) {
        return throwAppError(`Relation "${relation}" is not valid for entity type "${type}"`, StatusCodes.BAD_REQUEST);
    }
};

// Cap = max ACTIVE files an entity may hold for a relation; the existing-count only applies once an id is attached.
const assertWithinRelationCap = async (entity: any, tenant: any, incoming: number) => {
    const cap = getRelationCap(entity.type, entity.relation);
    if (cap === undefined) {
        return;
    }
    if (incoming > cap) {
        return throwAppError(
            `The "${entity.relation}" relation accepts at most ${cap} file(s)`,
            StatusCodes.BAD_REQUEST,
        );
    }
    if (!entity.id) {
        return;
    }
    // Count existing ACTIVE files for this entity + relation.
    const filter: any = {
        'entity.id': entity.id,
        'entity.type': entity.type,
        'entity.relation': entity.relation,
        status: FILE_STATUS.ACTIVE,
    };
    if (tenant) {
        filter.tenant = tenant;
    }
    const existing = await FileModel.countDocuments(filter);
    if (existing + incoming > cap) {
        return throwAppError(
            `The "${entity.relation}" relation already holds ${existing} of ${cap} active file(s). Please delete some first.`,
            StatusCodes.CONFLICT,
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

// File type is derived from the upload, not the client — image/* is an image, else a document.
const resolveFileType = (mimeType: string): string => {
    return mimeType?.startsWith('image/') ? FILE_TYPE.IMAGE : FILE_TYPE.DOCUMENT;
};

// Content is derived from the upload + storage result (pushed to storage here), never from the client.
const buildContent = async (file: any, entity: { type: string; relation: string }) => {
    try {
        const originalName: string = file.originalname;
        const extension = originalName.includes('.') ? originalName.split('.').pop()!.toLowerCase() : '';

        // Generic key, decoupled from business hierarchy: /{entityType}/{entityRelation}/{uuid}.{ext}.
        const uuid = generateUUID();
        const key = ['', entity.type, entity.relation, extension ? `${uuid}.${extension}` : uuid].join('/');

        const provider = storageManager.get(S3); // explicitly the S3 provider
        const result: any = await provider.upload({
            buffer: file.buffer,
            mimetype: file.mimetype,
            key,
        });

        return {
            provider: S3,
            // fall back to the derived key until the storage provider returns real coordinates
            path: result?.path ?? key,
            identifier: result?.identifier ?? result?.key ?? key,
            originalName,
            displayName: originalName,
            mimeType: file.mimetype,
            extension,
            size: file.size,
        };
    } catch (error: any) {
        logger.error({ err: error }, error?.message || 'Failed to build file content / upload to storage');
        return throwAppError('Failed to upload the file to storage', StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

// Short-lived read-only presigned URL; failures swallowed to null so one bad object won't break a listing.
const presignUrl = async (content: any): Promise<string | null> => {
    if (!content?.identifier) {
        return null;
    }
    try {
        return await storageManager.get(content.provider || S3).getPresignedUrl(content.identifier);
    } catch (error: any) {
        logger.error({ err: error }, 'Failed to presign file URL');
        return null;
    }
};

// Attach the presigned url onto the doc as a plain (non-schema) field the mapper reads.
const withUrl = async (file: FileDocument): Promise<FileDocument> => {
    if (!file) {
        return file;
    }
    (file as any).url = await presignUrl(file.content);
    return file;
};

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

// Applies the optional, client-settable fields (used by both create and update). tenant is the
// resolved value folded back onto the model by create; entityId arrives nested at create
// (model.entity.id) and flat at update-attach (model.entityId).
const set = (model: any, entity: HydratedDocument<IFile>) => {
    if (model.tenant) {
        entity.tenant = model.tenant;
    }
    const entityId = model.entity?.id ?? model.entityId;
    if (entityId && entity.entity) {
        entity.entity.id = entityId;
    }
    if (model.tags) {
        entity.tags = model.tags;
    }
    if (model.displayName && entity.content) {
        entity.content.displayName = model.displayName;
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

    return await withUrl(await query);
};

const search = async (filters: ISearchFileQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { createdAt: -1 };

    //1: default scoping — platform sees all, customer pinned to own tenant (ctx.where)
    const where: mongoose.QueryFilter<IFile> = { ...ctx.where() };

    //2: platform staff may narrow to a specific tenant; ignored for customers (own-tenant only)
    if (filters.tenant && ctx.tenant?.type === TENANT_TYPE.PLATFORM) {
        where.tenant = filters.tenant;
    }

    //3: discarded files are hidden unless a file:manage actor explicitly asks for them
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

    // no presigned urls on listings — url is attached only on get/create/update
    return { count, items };
};

// Creates one File doc per uploaded file, all sharing the same tenant/owner/entity.
const create = async (model: ICreateFilePayload, ctx: RequestContext, files?: any[]): Promise<HydratedDocument<IFile>[]> => {
    //0: at least one upload is mandatory — content is derived from it
    ctx.logger.info({ files }, 'Files received in create');
    if (!files?.length) {
        return throwAppError('A file upload is required', StatusCodes.BAD_REQUEST);
    }

    //1: resolve the owning tenant (existence-checked for platform, own-tenant for customer), then
    // fold the resolved value back onto the model so set() assigns it
    const tenant = await resolveTenant(model, ctx);
    model.tenant = tenant;

    //2: coherence — the relation must be valid for the entity type
    assertRelationCoherent(model.entity.type, model.entity.relation);

    //3: enforce the relation cap (existing-count only applies once an id is attached — upload-first)
    await assertWithinRelationCap(model.entity, tenant, files.length);

    //4: the acting role owns every file
    const owner = resolveOwner(ctx);

    //5: one File doc per uploaded file — type + content are derived per file
    const created: HydratedDocument<IFile>[] = [];
    for (const file of files) {
        const type = resolveFileType(file.mimetype);
        const content = await buildContent(file, model.entity);

        // owner/type/entity.type+relation/content seeded here; status defaults to DRAFT; tenant, entity.id and tags flow through set()
        const doc = new FileModel({
            owner,
            type,
            entity: {
                type: model.entity.type,
                relation: model.entity.relation,
            },
            content,
        });

        let fileDoc = set(model, doc);
        fileDoc = await fileDoc.save();

        // only activate when the file is attached to an entity (cap already validated above); otherwise it stays draft
        if (model.entity.id) {
            fileDoc = (await FileService.changeStatus((fileDoc._id as any).toString(), { status: FILE_STATUS.ACTIVE }, ctx)) as HydratedDocument<IFile>;
        }

        created.push((await withUrl(fileDoc)) as HydratedDocument<IFile>);
    }

    return created;
};

const update = async (id: string, model: IUpdateFilePayload, ctx: RequestContext) => {
    //1: get first (scoped)
    let file = await FileService.get(id, ctx);
    if (!file) {
        return throwAppError('File not found', StatusCodes.NOT_FOUND);
    }

    //2: attach the record later (upload-first) — a one-time link; cap enforced now a real entity is known
    if (model.entityId) {
        if (!file.entity) {
            return throwAppError('File has no entity classification to attach to', StatusCodes.CONFLICT);
        }
        if (file.entity.id) {
            return throwAppError('File is already attached to an entity', StatusCodes.CONFLICT);
        }
        await assertWithinRelationCap(
            { id: model.entityId, type: file.entity.type, relation: file.entity.relation },
            file.tenant?.toString(),
            1,
        );
    }

    //3: apply editable fields (entity.id assignment handled in set)
    file = set(model, file);
    file = await file.save();

    return file;
};

// Status moves via the FILE_TRANSITION_MAP, never a free write; discarded is terminal.
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
        return throwAppError(`Cannot move a file from "${current}" to "${model.status}"`, StatusCodes.CONFLICT);
    }

    //4: moving INTO active must respect the relation cap (existing active + this one <= maxFiles).
    // The file isn't active yet (no-op guard above), so it isn't already in the count.
    if (model.status === FILE_STATUS.ACTIVE) {
        await assertWithinRelationCap(
            { id: file.entity?.id, type: file.entity?.type, relation: file.entity?.relation },
            file.tenant?.toString(),
            1,
        );
    }

    //5: apply + save
    file.status = model.status;
    return await file.save();
};

// Batch attach previously uploaded draft files to a now-existing record and activate them together.
// The whole batch is validated against the relation cap first — all or nothing (no partial success).
const attach = async (model: IAttachFilesPayload, ctx: RequestContext): Promise<HydratedDocument<IFile>[]> => {
    //1: load every file (tenant-scoped); all must exist
    const files: HydratedDocument<IFile>[] = [];
    for (const id of model.fileIds) {
        const file = await FileService.get(id, ctx);
        if (!file) {
            return throwAppError(`File "${id}" not found`, StatusCodes.NOT_FOUND);
        }
        files.push(file);
    }

    //2: every file must be an unattached draft
    for (const file of files) {
        if (file.status !== FILE_STATUS.DRAFT) {
            return throwAppError(`File "${file._id}" is not a draft`, StatusCodes.CONFLICT);
        }
        if (file.entity?.id) {
            return throwAppError(`File "${file._id}" is already attached to an entity`, StatusCodes.CONFLICT);
        }
    }

    //3: all files must share one entity type + relation + tenant (the cap is per entity + relation)
    const first = files[0]!;
    const type = first.entity?.type;
    const relation = first.entity?.relation;
    const tenant = first.tenant?.toString();
    if (!type || !relation) {
        return throwAppError('File has no entity classification to attach to', StatusCodes.CONFLICT);
    }
    for (const file of files) {
        if (file.entity?.type !== type || file.entity?.relation !== relation) {
            return throwAppError('All files must share the same entity type and relation', StatusCodes.BAD_REQUEST);
        }
        if (file.tenant?.toString() !== tenant) {
            return throwAppError('All files must belong to the same tenant', StatusCodes.BAD_REQUEST);
        }
    }

    //4: validate the whole batch against the cap (existing active + these files <= maxFiles)
    await assertWithinRelationCap({ id: model.entityId, type, relation }, tenant, files.length);

    //5: attach + activate atomically — all or nothing
    const activated = await withTransaction(async () => {
        const updated: HydratedDocument<IFile>[] = [];
        for (const file of files) {
            if (file.entity) {
                file.entity.id = model.entityId;
            }
            file.status = FILE_STATUS.ACTIVE;
            updated.push(await file.save());
        }
        return updated;
    });

    //6: attach presigned urls for the response
    const result: HydratedDocument<IFile>[] = [];
    for (const doc of activated) {
        result.push((await withUrl(doc)) as HydratedDocument<IFile>);
    }
    return result;
};

export const FileService = {
    get,
    search,
    create,
    update,
    changeStatus,
    attach,
};
