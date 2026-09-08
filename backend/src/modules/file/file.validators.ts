// File Validators
import { z } from 'zod';
import { isValidObjectID } from '../../shared/utils/strings';
import { ENTITY_RELATION_ARRAY, ENTITY_TYPE, FILE_STATUS, FILE_TYPE } from './file.constants';

const objectId = (label: string) =>
    z.string().refine((val) => isValidObjectID(val), {
        message: `${label} must be a valid id`,
    });

// The upload metadata block — mirrors the embedded contentSchema on the model. Every field is
// captured at registration time from the storage provider (S3, etc.) and is never edited afterwards.
const ContentSchema = z.object({
    provider: z.string().min(1).openapi({ example: 's3' }),
    path: z.string().min(1).openapi({ example: 'tenants/665f.../logo/abc.png' }),
    identifier: z.string().min(1).openapi({ example: 'abc123-key' }),
    originalName: z.string().min(1).openapi({ example: 'company-logo.png' }),
    displayName: z.string().min(1).openapi({ example: 'Company Logo' }),
    mimeType: z.string().min(1).openapi({ example: 'image/png' }),
    extension: z.string().min(1).openapi({ example: 'png' }),
    size: z.number().min(0).openapi({ example: 20480 }),
});

// The polymorphic owner reference — which record this file hangs off, and in what role.
// `relation` is validated for coherence against `type` in the service (ENTITY_RELATION map).
const EntitySchema = z.object({
    id: z.string().min(1).openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
    type: z.enum(Object.values(ENTITY_TYPE)).openapi({ example: 'tenant' }),
    relation: z.enum(ENTITY_RELATION_ARRAY).openapi({ example: 'logo' }),
});

//1: create ====================================>
// status is intentionally omitted — a new file always starts at DRAFT (model default).
// owner is intentionally omitted — it is pinned from the acting role in the service.
export const CreateFilePayloadSchema = z.object({
    // required only for platform (QMS) staff — which tenant this file belongs to.
    // ignored for customer users: the service pins it to their own tenant.
    tenant: objectId('Tenant').optional().openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
    entity: EntitySchema,
    content: ContentSchema,
    type: z.enum(Object.values(FILE_TYPE)).optional().openapi({ example: 'image' }),
    tags: z.array(z.string()).optional().openapi({ example: ['branding'] }),
});
export type ICreateFilePayload = z.infer<typeof CreateFilePayloadSchema>;

//2: update ====================================>
// Only presentational metadata is editable. entity / content / tenant / owner are immutable,
// and status moves only through the dedicated transition endpoint (changeStatus).
export const UpdateFilePayloadSchema = z.object({
    displayName: z.string().min(1).optional().openapi({ example: 'Company Logo (2026)' }),
    tags: z.array(z.string()).optional().openapi({ example: ['branding', 'active'] }),
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
