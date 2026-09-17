// File Validators
import { z } from 'zod';
import { isValidObjectID } from '../../shared/utils/strings';
import { ENTITY_RELATION_ARRAY, ENTITY_TYPE, FILE_STATUS, FILE_TYPE } from './file.constants';

const objectId = (label: string) =>
    z.string().refine((val) => isValidObjectID(val), {
        message: `${label} must be a valid id`,
    });

// Multipart sends an untouched optional field as '' — treat '' as "not provided" so .optional() kicks in.
const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v);

// Multipart: repeated field → string[], lone value → string, empty → ''. Normalise to an optional string[].
const toOptionalStringArray = (v: unknown) => {
    if (v === '' || v === undefined || v === null) {
        return undefined;
    }
    return Array.isArray(v) ? v : [v];
};

//1: create ====================================>
// status/owner/content/type are omitted — all derived/pinned in the service. The entity ref is three
// flat fields (easier over multipart), folded back into a nested `entity` so the service sees model.entity.*.
export const CreateFilePayloadSchema = z
    .object({
        // required for platform staff, ignored for customers (service pins it to their own tenant)
        tenant: z
            .preprocess(emptyToUndefined, objectId('Tenant').optional())
            .openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
        // optional — upload-first: the record is attached later via update (type + relation stay required)
        entityId: z
            .preprocess(emptyToUndefined, z.string().min(1).optional())
            .openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
        entityType: z.enum(Object.values(ENTITY_TYPE)).openapi({ example: 'tenant' }),
        entityRelation: z.enum(ENTITY_RELATION_ARRAY).openapi({ example: 'logo' }),
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
