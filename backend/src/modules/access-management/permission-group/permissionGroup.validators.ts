import { z } from 'zod';
import { PERMISSION_GROUP_STATUSES } from './permissionGroup.constants';

const PermissionSchema = z.object({
    code: z.string().min(1).openapi({ example: 'user:create' }),
    name: z.string().min(1).openapi({ example: 'Create User' }),
    description: z.string().optional().openapi({ example: 'Allows creating a new user' }),
});

//1: create ====================================>
export const CreatePermissionGroupPayloadSchema = z.object({
    code: z.string().min(1).lowercase().openapi({ example: 'admin-group' }),
    name: z.string().min(1).openapi({ example: 'Admin Group' }),
    description: z.string().min(1).openapi({ example: 'Full access permission group' }),
    tenant: z.string().min(1).openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d1' }),
    permissions: z.array(PermissionSchema).optional().default([]).openapi({ example: [] }),
});

export type ICreatePermissionGroupPayload = z.infer<typeof CreatePermissionGroupPayloadSchema>;

//2: update ====================================>
export const UpdatePermissionGroupPayloadSchema = z.object({
    name: z.string().min(1).optional().openapi({ example: 'Admin Group' }),
    description: z.string().min(1).optional().openapi({ example: 'Full access permission group' }),
    status: z.enum([PERMISSION_GROUP_STATUSES.ACTIVE, PERMISSION_GROUP_STATUSES.INACTIVE]).optional().openapi({ example: 'active' }),
    permissions: z.array(PermissionSchema).optional().openapi({ example: [] }),
});

export type IUpdatePermissionGroupPayload = z.infer<typeof UpdatePermissionGroupPayloadSchema>;

//3: search ====================================>
export const SearchPermissionGroupQuerySchema = z.object({
    name: z.string().optional().openapi({ example: 'Admin Group' }),
    code: z.string().lowercase().optional().openapi({ example: 'admin-group' }),
    status: z.enum([PERMISSION_GROUP_STATUSES.ACTIVE, PERMISSION_GROUP_STATUSES.INACTIVE]).optional().openapi({ example: 'active' }),
    tenant: z.string().optional().openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d1' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});

export type ISearchPermissionGroupQuery = z.infer<typeof SearchPermissionGroupQuerySchema>;
