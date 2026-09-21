// File Validators
import { z } from 'zod';
import { isValidObjectID } from '../../shared/utils/strings';
import { ENTITY_RELATION_ARRAY, ENTITY_TYPE, FILE_STATUS, FILE_TYPE } from './file.constants';

const objectId = (label: string) =>
    z.string().refine((val) => isValidObjectID(val), {
        message: `${label} must be a valid id`,
    });

//1: create ====================================>
// Presigned-upload flow: the client sends file METADATA only (no binary). status/owner/content/type
// are derived/pinned in the service; the service creates a draft doc per file and returns a presigned
// upload URL for each. The entity ref is three flat fields, folded back into a nested `entity` so the
// service sees model.entity.*. `fileType` is the file's MIME type (drives the S3 ContentType + the
// derived image/document classification).
const FileMetaSchema = z.object({
    fileName: z.string().min(1).openapi({ example: 'logo.png' }),
    fileSize: z.number().int().positive().openapi({ example: 20480 }),
    fileType: z.string().min(1).openapi({ example: 'image/png' }),
});

export const CreateFilePayloadSchema = z
    .object({
        // required; used for platform staff, ignored for customers (service pins it to their own tenant)
        tenant: objectId('Tenant').openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
        // optional — upload-first: the record is attached later via update (type + relation stay required)
        entityId: objectId('Entity').optional().openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
        entityType: z.enum(Object.values(ENTITY_TYPE)).openapi({ example: 'tenant' }),
        entityRelation: z.enum(ENTITY_RELATION_ARRAY).openapi({ example: 'logo' }),
        tags: z.array(z.string()).optional().openapi({ example: ['branding'] }),
        // one entry per file — a draft doc + a presigned upload URL is produced for each
        files: z.array(FileMetaSchema).min(1).openapi({ example: [{ fileName: 'logo.png', fileSize: 20480, fileType: 'image/png' }] }),
    })
    .transform((v) => ({
        tenant: v.tenant,
        entity: { id: v.entityId, type: v.entityType, relation: v.entityRelation },
        tags: v.tags,
        files: v.files,
    }));
export type ICreateFilePayload = z.infer<typeof CreateFilePayloadSchema>;

//2: update ====================================>
// Presentational metadata is editable; entityId is the exception — attach an unlinked file to its record (one-time).
export const UpdateFilePayloadSchema = z.object({
    displayName: z.string().min(1).optional().openapi({ example: 'Company Logo (2026)' }),
    tags: z.array(z.string()).optional().openapi({ example: ['branding', 'active'] }),
    entityId: objectId('Entity').optional().openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
});
export type IUpdateFilePayload = z.infer<typeof UpdateFilePayloadSchema>;

//3: change status ====================================>
// The target status; the move is validated against FILE_TRANSITION_MAP in the service.
export const ChangeFileStatusPayloadSchema = z.object({
    status: z.enum(Object.values(FILE_STATUS)).openapi({ example: 'active' }),
});
export type IChangeFileStatusPayload = z.infer<typeof ChangeFileStatusPayloadSchema>;

//4: search ====================================>
export const SearchFileQuerySchema = z.object({
    // only honoured for platform staff; customer users stay pinned to their own tenant
    tenant: objectId('Tenant').optional().openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
    entityId: z.string().optional().openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
    entityType: z.enum(Object.values(ENTITY_TYPE)).optional().openapi({ example: 'tenant' }),
    relation: z.enum(ENTITY_RELATION_ARRAY).optional().openapi({ example: 'logo' }),
    type: z.enum(Object.values(FILE_TYPE)).optional().openapi({ example: 'image' }),
    // discarded is only visible to a file:manage actor (see the service)
    status: z.enum(Object.values(FILE_STATUS)).optional().openapi({ example: 'active' }),
    owner: objectId('Owner').optional().openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
    tag: z.string().optional().openapi({ example: 'branding' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchFileQuery = z.infer<typeof SearchFileQuerySchema>;

//5: bulk activate ====================================>
// After the client has uploaded the objects to S3 via the presigned URLs, it flips the whole batch
// of draft files to active in one call. Each move is validated against the transition map + cap in
// the service — all or nothing.
export const BulkActivateFilesPayloadSchema = z.object({
    fileIds: z.array(objectId('File')).min(1).openapi({ example: ['665f0c3a1a2b3c4d5e6f7a8a'] }),
});
export type IBulkActivateFilesPayload = z.infer<typeof BulkActivateFilesPayloadSchema>;
