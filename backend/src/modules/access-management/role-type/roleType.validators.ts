import { z } from 'zod';
import { ROLE_TYPE_STATUSES } from './roleType.constants';
import mongoose from 'mongoose';

//1: create ====================================>
export const CreateRoleTypePayloadSchema = z.object({
    // custom role-type codes are free-form kebab-case; reserved (system/default) codes are blocked
    // in the service via the isSystem guard, not here.
    code: z
        .string()
        .min(2)
        .max(50)
        .regex(/^[a-z][a-z0-9-]*$/, {
            message: 'Code must be lowercase kebab-case: start with a letter, then letters, numbers or hyphens',
        })
        .openapi({ example: 'field-agent' }),
    name: z.string().min(1).openapi({ example: 'hr' }),
    description: z.string().optional().openapi({ example: 'HR role type' }),
    tenant: z
        .string()
        .refine((value) => mongoose.Types.ObjectId.isValid(value), {
            message: 'Invalid ObjectId',
        })
        .openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d1' }),
    permissions: z
        .array(z.string().min(1))
        .optional()
        .default([])
        .openapi({ example: ['user:create', 'user:get'] }),
});

export type ICreateRoleTypePayload = z.infer<
    typeof CreateRoleTypePayloadSchema
>;

//2: update ====================================>
export const UpdateRoleTypePayloadSchema = z.object({
    name: z.string().min(1).optional().openapi({ example: 'Administrator' }),
    description: z.string().optional().openapi({ example: 'HR role type' }),
    permissions: z
        .array(z.string().min(1))
        .optional()
        .openapi({ example: ['user:create', 'user:get'] }),
    status: z
        .enum([ROLE_TYPE_STATUSES.ACTIVE, ROLE_TYPE_STATUSES.INACTIVE])
        .optional()
        .openapi({ example: 'active' }),
});

export type IUpdateRoleTypePayload = z.infer<
    typeof UpdateRoleTypePayloadSchema
>;

//3: search ====================================>
export const SearchRoleTypeQuerySchema = z.object({
    name: z.string().optional().openapi({ example: 'Administrator' }),
    code: z.string().lowercase().optional().openapi({ example: 'admin' }),
    status: z
        .enum([ROLE_TYPE_STATUSES.ACTIVE, ROLE_TYPE_STATUSES.INACTIVE])
        .optional()
        .openapi({ example: 'active' }),
    tenant: z
        .string()
        .optional()
        .openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d1' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});

export type ISearchRoleTypeQuery = z.infer<typeof SearchRoleTypeQuerySchema>;
