import { z } from 'zod';
import { TENANT_STATUS } from './tenant.constants';
import { isValidObjectID } from '../../../shared/utils/strings';

//1: create ====================================>
export const CreateTenantPayloadSchema = z.object({
    code: z
        .string()
        .min(1)
        .lowercase()
        .refine((val) => !isValidObjectID(val), {
            message: 'Code must not be an ObjectId',
        })
        .openapi({ example: 'acme' }),
    name: z.string().min(1).openapi({ example: 'Acme Corp' }),
    // owner: z
    //     .string()
    //     .optional()
    //     .openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d1' }),
});

export type ICreateTenantPayload = z.infer<typeof CreateTenantPayloadSchema>;

//2: update ====================================>
export const UpdateTenantPayloadSchema = z.object({
    name: z.string().min(1).optional().openapi({ example: 'Acme Corp' }),
    // owner: z
    //     .string()
    //     .optional()
    //     .openapi({ example: '64f1a2b3c4d5e6f7a8b9c0d1' }),
    status: z
        .enum([TENANT_STATUS.ACTIVE, TENANT_STATUS.INACTIVE])
        .optional()
        .openapi({ example: 'active' }),
});

export type IUpdateTenantPayload = z.infer<typeof UpdateTenantPayloadSchema>;

//3: search ====================================>
export const SearchTenantQuerySchema = z.object({
    name: z.string().optional().openapi({ example: 'Acme Corp' }),
    code: z.string().lowercase().optional().openapi({ example: 'acme' }),
    status: z
        .enum([TENANT_STATUS.ACTIVE, TENANT_STATUS.INACTIVE])
        .optional()
        .openapi({ example: 'active' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});

export type ISearchTenantQuery = z.infer<typeof SearchTenantQuerySchema>;
