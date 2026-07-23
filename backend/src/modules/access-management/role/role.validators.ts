import { z } from 'zod';
import { ROLE_STATUSES } from './role.constants';
import { RegisterUserPayloadSchema } from '../../auth/auth.validators';
import { UpdateUserPayloadSchema } from '../../user/user.validators';

//1: create ====================================>
export const CreateRolePayloadSchema = z.object({
    code: z
        .string()
        .min(1)
        .lowercase()
        .openapi({ example: 'site-manager-john' }),
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
    // optional — the role this role reports to (its manager). Must be in the same tenant.
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
    user: z
        .string()
        .optional()
        .openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d2' }),
    division: z
        .string()
        .optional()
        .openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d4' }),
    // filter roles by their manager — e.g. "list everyone reporting to this ASM"
    supervisor: z
        .string()
        .optional()
        .openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d5' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});

export type ISearchRoleQuery = z.infer<typeof SearchRoleQuerySchema>;
