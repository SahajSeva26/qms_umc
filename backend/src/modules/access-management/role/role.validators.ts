import { z } from 'zod';
import { ROLE_STATUSES } from './role.constants';
import { RegisterUserPayloadSchema } from '../../auth/auth.validators';
import { UpdateUserPayloadSchema } from '../../user/user.validators';
import { stripWhitespace } from '../../../shared/utils/strings';

//1: create ====================================>
export const CreateRolePayloadSchema = z.object({
    // optional — for pharma field-force roles (MR/ASM/RSM) the service auto-generates a code from
    // the universal pharma-role counter when omitted; every other role type still requires one.
    code: z.preprocess(
        stripWhitespace,
        z.string().min(1).toLowerCase(),
    ).optional().openapi({ example: 'site-manager-john' }),
    name: z.string().min(1).openapi({ example: 'Site Manager' }),
    description: z
        .string()
        .optional()
        .openapi({ example: 'Manages site operations' }),
    permissions: z
        .array(z.string().min(1))
        .optional()
        .default([])
        .openapi({ example: ['document:read'] }),
    type: z.string().min(1).openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d1' }),
    tenant: z.string().min(1).openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d3' }),
    // optional — only customer field-force roles (MR/HO/ASM/RSM) carry a division
    division: z.string().min(1).optional().openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d4' }),
    // optional at the schema level — the role this role reports to (its manager), must be in the
    // same tenant. Whether it's actually REQUIRED depends on the role type: the service rejects a
    // missing supervisor for any role the ROLE_SUPERVISOR_TREE places under a parent, and exempts
    // roots (no/empty tree entry).
    supervisor: z.string().min(1).optional().openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d5' }),
    user: RegisterUserPayloadSchema,
});

export type ICreateRolePayload = z.infer<typeof CreateRolePayloadSchema>;

//2: update ====================================>
export const UpdateRolePayloadSchema = z.object({
    name: z.string().min(1).optional().openapi({ example: 'Site Manager' }),
    description: z
        .string()
        .optional()
        .openapi({ example: 'Manages site operations' }),
    permissions: z
        .array(z.string().min(1))
        .optional()
        .openapi({ example: ['document:read'] }),
    status: z
        .enum([ROLE_STATUSES.ACTIVE, ROLE_STATUSES.INACTIVE])
        .optional()
        .openapi({ example: 'active' }),
    type: z
        .string()
        .min(1)
        .optional()
        .openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d1' }),
    division: z.string().min(1).optional().openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d4' }),
    supervisor: z.string().min(1).optional().openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d5' }),
    user: UpdateUserPayloadSchema.optional(),
});

export type IUpdateRolePayload = z.infer<typeof UpdateRolePayloadSchema>;

//3: search ====================================>
export const SearchRoleQuerySchema = z.object({
    // free-text keyword matched against the linked user's first name / email. Resolved via
    // UserService.search, then roles are filtered by their `user` field (member-picker typeahead).
    user: z.string().optional().openapi({ example: 'priya' }),
    name: z.string().optional().openapi({ example: 'Site Manager' }),
    code: z
        .string()
        .lowercase()
        .optional()
        .openapi({ example: 'site-manager-john' }),
    status: z
        .enum([ROLE_STATUSES.ACTIVE, ROLE_STATUSES.INACTIVE])
        .optional()
        .openapi({ example: 'active' }),
    tenant: z
        .string()
        .optional()
        .openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d3' }),
    type: z
        .string()
        .optional()
        .openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d1' }),
    division: z
        .string()
        .optional()
        .openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d4' }),
    // filter roles by their manager — e.g. "list everyone reporting to this ASM". Accepts a single
    // id OR a list of ids (→ $in), so callers can fetch "everyone reporting to any of these managers"
    // in one paginated query (used by the RSM downline lookup, which spans many ASMs).
    supervisor: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d5' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});

export type ISearchRoleQuery = z.infer<typeof SearchRoleQuerySchema>;

//4: downline MRs ====================================>
// query for GET /roles/mrs — returns the caller's own downline MRs (pharma HO/RSM/ASM only).
// `name` is the MR person's name (matched against the linked user), not the role's name field.
export const SearchDownlineMrQuerySchema = z.object({
    name: z.string().optional().openapi({ example: 'priya' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '20' }),
});

export type ISearchDownlineMrQuery = z.infer<typeof SearchDownlineMrQuerySchema>;
