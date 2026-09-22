// File Service
import mongoose, { HydratedDocument } from 'mongoose';
import { FileModel, IFile } from './file.model';
import { IBulkActivateFilesPayload, IChangeFileStatusPayload, ICreateFilePayload, ISearchFileQuery, IUpdateFilePayload } from './file.validators';
import { ENTITY_RELATION, FILE_PERMISSIONS, FILE_STATUS, FILE_TRANSITION_MAP, FILE_TYPE, getRelationCap } from './file.constants';
import { throwAppError } from '../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../shared/utils/strings';
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

// tenant is required for everyone (validator-enforced). A customer may only pass their OWN tenant id —
// anything else is rejected, not silently ignored. A platform actor's tenant is existence-checked here.
const resolveTenant = async (model: ICreateFilePayload, ctx: RequestContext): Promise<string> => {
    if (ctx.tenant?.type === TENANT_TYPE.CUSTOMER) {
        const own = (ctx.tenant?._id || ctx.tenant?.id)?.toString();
        if (model.tenant !== own) {
            return throwAppError('You can only upload files for your own tenant', StatusCodes.FORBIDDEN);
        }
        return own;
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

// Content is derived from the client-sent metadata (presigned-upload flow — nothing is uploaded
// server-side here). The storage key embeds the file doc's own _id, giving a strict 1:1 object↔doc
// mapping: at activation we can HeadObject exactly this key and know it's the object for this doc.
const buildContentFromMeta = (meta: { fileName: string; fileSize: number; fileType: string }, entity: { type: string; relation: string }, fileId: string) => {
    const originalName = meta.fileName;
    const extension = originalName.includes('.') ? originalName.split('.').pop()!.toLowerCase() : '';

    // Deterministic key, decoupled from business hierarchy: {entityType}/{entityRelation}/{fileId}.{ext}.
    const key = [entity.type, entity.relation, extension ? `${fileId}.${extension}` : fileId].join('/');

    return {
        provider: S3,
        path: key,
        identifier: key,
        originalName,
        displayName: originalName,
        mimeType: meta.fileType,
        extension,
        size: meta.fileSize,
    };
};

// Short-lived presigned PUT URL the client uploads the object to directly. Failures are fatal here —
// a doc without an upload URL is useless to the caller — so we surface a 500.
const getUploadUrl = async (content: any): Promise<string> => {
    try {
        const result = await storageManager.get(content.provider || S3).upload({
            key: content.identifier,
            mimetype: content.mimeType,
        });
        return result.url;
    } catch (error: any) {
        logger.error({ err: error, key: content?.identifier }, 'Failed to generate a presigned upload URL');
        return throwAppError('Failed to generate an upload URL', StatusCodes.INTERNAL_SERVER_ERROR);
    }
};

// Before a file may go active, confirm its object actually landed in storage. The storage key embeds
// the file's own _id, so we (1) assert the identifier matches this exact doc — no drifted/foreign
// object — and (2) HeadObject it. Missing object → 409 (client hasn't uploaded yet).
const assertObjectUploaded = async (file: HydratedDocument<IFile>) => {
    const content: any = file.content;
    const identifier: string | undefined = content?.identifier;
    const fileId = (file._id as any).toString();

    // exact match: the key must belong to this file doc (keys are /{type}/{relation}/{fileId}.{ext})
    if (!identifier || !identifier.includes(fileId)) {
        return throwAppError('The file object does not match this file record', StatusCodes.CONFLICT);
    }

    const head = await storageManager.get(content.provider || S3).headObject(identifier);
    if (!head.exists) {
        return throwAppError('File has not been uploaded to storage yet', StatusCodes.CONFLICT);
    }
};

// No-op guard + transition-map validation. Pure/sync — no DB, no storage.
const assertStatusTransition = (file: HydratedDocument<IFile>, target: string) => {
    const current = file.status as keyof typeof FILE_TRANSITION_MAP;
    if (current === target) {
        return throwAppError(`File is already "${target}"`, StatusCodes.CONFLICT);
    }
    const allowed: readonly string[] = FILE_TRANSITION_MAP[current] || [];
    if (!allowed.includes(target)) {
        return throwAppError(`Cannot move a file from "${current}" to "${target}"`, StatusCodes.CONFLICT);
    }
};

// Short-lived read-only presigned URL; failures swallowed to null so one bad object won't break a listing.
const presignUrl = async (content: any): Promise<string | null> => {
    if (!content?.identifier) {
        return null;
    }
    try {
        const { url } = (await storageManager.get(content.provider || S3).getUrl(content.identifier)) as { url: string };
        return url;
    } catch (error: any) {
        logger.error({ err: error }, 'Failed to presign file URL');
        return null;
    }
};

// Files are never deleted from storage inline — deletion is a soft-delete (status = discarded) and a
// cron later reclaims the storage objects of discarded files. On a failed create batch we mark the
// docs already persisted as discarded so they're unusable and the cron sweeps them. Best-effort.
const discardFiles = async (ids: string[]) => {
    if (!ids.length) {
        return;
    }
    try {
        await FileModel.updateMany({ _id: { $in: ids } }, { $set: { status: FILE_STATUS.DISCARDED } });
    } catch (error: any) {
        logger.error({ err: error, ids }, 'Failed to mark files discarded after a failed create batch');
    }
};

// Attach the presigned (read) url onto the doc as a plain (non-schema) field the mapper reads.
const withUrl = async (file: FileDocument): Promise<FileDocument> => {
    if (!file) {
        return file;
    }
    (file as any).url = await presignUrl(file.content);
    return file;
};

// Attach the presigned UPLOAD url onto the doc — the client PUTs the bytes to it (create response only).
const withUploadUrl = async (file: HydratedDocument<IFile>): Promise<HydratedDocument<IFile>> => {
    (file as any).uploadUrl = await getUploadUrl(file.content);
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

// Presigned-upload flow: creates one DRAFT File doc per file-metadata entry (all sharing the same
// tenant/owner/entity) and returns each doc with a presigned PUT `uploadUrl`. Nothing is uploaded
// server-side — the client PUTs the bytes to each URL, then flips the batch active via bulkActivate.
const create = async (model: ICreateFilePayload, ctx: RequestContext): Promise<HydratedDocument<IFile>[]> => {
    //0: at least one file's metadata is mandatory (validator-enforced, guarded here too)
    if (!model.files?.length) {
        return throwAppError('At least one file is required', StatusCodes.BAD_REQUEST);
    }

    //1: resolve the owning tenant (existence-checked for platform, own-tenant for customer), then
    // fold the resolved value back onto the model so set() assigns it
    const tenant = await resolveTenant(model, ctx);
    model.tenant = tenant;

    //2: coherence — the relation must be valid for the entity type
    assertRelationCoherent(model.entity.type, model.entity.relation);

    //3: enforce the relation cap (existing active-count only applies once an id is attached)
    await assertWithinRelationCap(model.entity, tenant, model.files.length);

    //4: the acting role owns every file
    const owner = resolveOwner(ctx);

    // One File doc per metadata entry — type + content derived per file. Track each persisted doc's id
    // so a mid-batch failure (e.g. presign error) soft-deletes the whole batch (status = discarded)
    // rather than leaving half of it usable; a cron reclaims the storage objects of discarded files.
    const createdIds: string[] = [];
    try {
        const created: HydratedDocument<IFile>[] = [];
        for (const meta of model.files) {
            const type = resolveFileType(meta.fileType);

            // instantiate first so the doc's _id exists (Mongoose assigns it at construction); the
            // storage key is derived from that _id so the object and the doc map 1:1.
            const doc = new FileModel({
                owner,
                type,
                entity: {
                    type: model.entity.type,
                    relation: model.entity.relation,
                },
            });
            doc.content = buildContentFromMeta(meta, model.entity, (doc._id as any).toString()) as any;

            let fileDoc = set(model, doc);
            fileDoc = await fileDoc.save();
            createdIds.push((fileDoc._id as any).toString());

            // files stay DRAFT until the client uploads and calls bulkActivate — attach the upload URL
            created.push(await withUploadUrl(fileDoc));
        }

        return created;
    } catch (error: any) {
        // the batch failed — soft-delete whatever was persisted so nothing partial stays usable
        await discardFiles(createdIds);
        throw error;
    }
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

    //2: no-op guard + validate the transition against the state machine
    assertStatusTransition(file, model.status);

    //3: moving INTO active must respect the relation cap (existing active + this one <= maxFiles; the
    // file isn't active yet, so it isn't already in the count) AND its object must exist in storage —
    // the object check always runs when going active, never optional.
    if (model.status === FILE_STATUS.ACTIVE) {
        await assertWithinRelationCap(
            { id: file.entity?.id, type: file.entity?.type, relation: file.entity?.relation },
            file.tenant?.toString(),
            1,
        );
        await assertObjectUploaded(file);
    }

    //4: apply + save
    file.status = model.status;
    return await file.save();
};

// Bulk flip a batch of draft files to active once the client has uploaded the objects to S3. Each
// move reuses changeStatus (transition-map + relation-cap validated) inside one transaction — all or
// nothing. The GET presigned url is attached for the response (the objects now exist).
const bulkActivate = async (model: IBulkActivateFilesPayload, ctx: RequestContext): Promise<HydratedDocument<IFile>[]> => {
    //1: load every file (scoped), validate the transition, and verify its object exists — ALL before
    // the transaction (fail fast; keep the external S3 HeadObject calls out of the txn)
    const files: HydratedDocument<IFile>[] = [];
    for (const id of model.fileIds) {
        const file = await FileService.get(id, ctx);
        if (!file) {
            return throwAppError(`File "${id}" not found`, StatusCodes.NOT_FOUND);
        }
        assertStatusTransition(file, FILE_STATUS.ACTIVE);
        await assertObjectUploaded(file);
        files.push(file);
    }

    //2: flip the batch active in one transaction. The relation-cap check stays INSIDE the txn so each
    // file sees the ones already activated in this batch (an accurate running count).
    const activated = await withTransaction(async () => {
        const updated: HydratedDocument<IFile>[] = [];
        for (const file of files) {
            await assertWithinRelationCap(
                { id: file.entity?.id, type: file.entity?.type, relation: file.entity?.relation },
                file.tenant?.toString(),
                1,
            );
            file.status = FILE_STATUS.ACTIVE;
            updated.push(await file.save());
        }
        return updated;
    });

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
    bulkActivate,
};
