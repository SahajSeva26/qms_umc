// File Validators
import { z } from 'zod';
import { isValidObjectID } from '../../shared/utils/strings';
import { ENTITY_RELATION_ARRAY, ENTITY_TYPE, FILE_STATUS, FILE_TYPE } from './file.constants';

const objectId = (label: string) =>
    z.string().refine((val) => isValidObjectID(val), {
        message: `${label} must be a valid id`,
    });

// multipart form-data sends an untouched optional text field as an empty string rather than
// omitting it — treat '' as "not provided" so `.optional()` actually kicks in.
const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v);

// Over multipart a repeated field arrives as string[] (many), a lone value as a plain string, and
// an empty field as ''. Normalise all of them to an optional string[].
const toOptionalStringArray = (v: unknown) => {
    if (v === '' || v === undefined || v === null) {
        return undefined;
    }
    return Array.isArray(v) ? v : [v];
};

//1: create ====================================>
// status is intentionally omitted — a new file always starts at DRAFT (model default).
// owner is intentionally omitted — it is pinned from the acting role in the service.
// content and type are intentionally omitted — both are derived from the uploaded file in the
// service, never accepted from the client.
// The entity reference is captured as three flat fields (`entityId`/`entityType`/`entityRelation`)
// because they're far easier to submit via a multipart form than a nested JSON object; they're
// folded back into a nested `entity` here so the service keeps seeing `model.entity.*`.
export const CreateFilePayloadSchema = z
    .object({
        // required only for platform (QMS) staff — which tenant this file belongs to.
        // ignored for customer users: the service pins it to their own tenant.
        // multipart form-data sends an untouched optional field as '' (not omitted), so normalise
        // '' → undefined before validating; otherwise `.optional()` still runs against the ''.
        tenant: z
            .preprocess(emptyToUndefined, objectId('Tenant').optional())
            .openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
        entityId: z.string().min(1).openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
        entityType: z.enum(Object.values(ENTITY_TYPE)).openapi({ example: 'tenant' }),
        entityRelation: z.enum(ENTITY_RELATION_ARRAY).openapi({ example: 'logo' }),
        // tags arrive as '' (empty), a single string, or a string[] over multipart — coerce all
        // three to an optional string array.
        tags: z
            .preprocess(toOptionalStringArray, z.array(z.string()).optional())
            .openapi({ example: ['branding'] }),
    })
    .transform((v) => ({
        tenant: v.tenant,
        entity: { id: v.entityId, type: v.entityType, relation: v.entityRelation },
        tags: v.tags,
    }));
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
