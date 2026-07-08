import { z } from 'zod';
import { ROLE_STATUSES } from './role.constants';

//1: create ====================================>
export const CreateRolePayloadSchema = z.object({
    code: z.string().min(1).lowercase().openapi({ example: 'site-manager-john' }),
    name: z.string().min(1).openapi({ example: 'Site Manager' }),
    description: z.string().optional().openapi({ example: 'Manages site operations' }),
    permissions: z.array(z.string().min(1)).optional().default([]).openapi({ example: ['document:read'] }),
    type: z.string().min(1).openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d1' }),
    user: z.string().min(1).openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d2' }),
    tenant: z.string().min(1).openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d3' }),
});

export type ICreateRolePayload = z.infer<typeof CreateRolePayloadSchema>;

//2: update ====================================>
export const UpdateRolePayloadSchema = z.object({
    name: z.string().min(1).optional().openapi({ example: 'Site Manager' }),
    description: z.string().optional().openapi({ example: 'Manages site operations' }),
    permissions: z.array(z.string().min(1)).optional().openapi({ example: ['document:read'] }),
    status: z.enum([ROLE_STATUSES.ACTIVE, ROLE_STATUSES.INACTIVE]).optional().openapi({ example: 'active' }),
    type: z.string().min(1).optional().openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d1' }),
});

export type IUpdateRolePayload = z.infer<typeof UpdateRolePayloadSchema>;

//3: search ====================================>
export const SearchRoleQuerySchema = z.object({
    name: z.string().optional().openapi({ example: 'Site Manager' }),
    code: z.string().lowercase().optional().openapi({ example: 'site-manager-john' }),
    status: z.enum([ROLE_STATUSES.ACTIVE, ROLE_STATUSES.INACTIVE]).optional().openapi({ example: 'active' }),
    tenant: z.string().optional().openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d3' }),
    type: z.string().optional().openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d1' }),
    user: z.string().optional().openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d2' }),
});

export type ISearchRoleQuery = z.infer<typeof SearchRoleQuerySchema>;
