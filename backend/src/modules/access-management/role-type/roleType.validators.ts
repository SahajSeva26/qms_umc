import { z } from 'zod';
import { ROLE_TYPE_STATUSES } from './roleType.constants';

//1: create ====================================>
export const CreateRoleTypePayloadSchema = z.object({
    code: z.string().min(1).lowercase().openapi({ example: 'admin' }),
    name: z.string().min(1).openapi({ example: 'Administrator' }),
    tenant: z.string().min(1).openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d1' }),
    permissions: z.array(z.string().min(1)).optional().default([]).openapi({ example: ['user:create', 'user:read'] }),
    category: z.string().optional().openapi({ example: 'system' }),
});

export type ICreateRoleTypePayload = z.infer<typeof CreateRoleTypePayloadSchema>;

//2: update ====================================>
export const UpdateRoleTypePayloadSchema = z.object({
    name: z.string().min(1).optional().openapi({ example: 'Administrator' }),
    permissions: z.array(z.string().min(1)).optional().openapi({ example: ['user:create', 'user:read'] }),
    status: z
        .enum([ROLE_TYPE_STATUSES.ACTIVE, ROLE_TYPE_STATUSES.INACTIVE])
        .optional()
        .openapi({ example: 'active' }),
    category: z.string().optional().openapi({ example: 'system' }),
});

export type IUpdateRoleTypePayload = z.infer<typeof UpdateRoleTypePayloadSchema>;

//3: search ====================================>
export const SearchRoleTypeQuerySchema = z.object({
    name: z.string().optional().openapi({ example: 'Administrator' }),
    code: z.string().lowercase().optional().openapi({ example: 'admin' }),
    status: z
        .enum([ROLE_TYPE_STATUSES.ACTIVE, ROLE_TYPE_STATUSES.INACTIVE])
        .optional()
        .openapi({ example: 'active' }),
    tenant: z.string().optional().openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d1' }),
});

export type ISearchRoleTypeQuery = z.infer<typeof SearchRoleTypeQuerySchema>;
