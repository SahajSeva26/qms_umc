import { z } from 'zod';
import { DIVISION_STATUS, DIVISION_THERAPY } from './division.constants';
import { isValidObjectID, stripWhitespace } from '../../../shared/utils/strings';
import { RegisterUserPayloadSchema } from '../../auth/auth.validators';

//1: create ====================================>
export const CreateDivisionPayloadSchema = z.object({
    tenant: z.string().min(1).openapi({ example: 'sun-pharma' }),
    code: z.preprocess(
        stripWhitespace,
        z
            .string()
            .min(3)
            .lowercase()
            .refine((val) => !isValidObjectID(val), {
                message: 'Code must not be an ObjectId',
            }),
    ).openapi({ example: 'sun-cardio' }),
    name: z.string().min(1).openapi({ example: 'Cardio Care' }),
    therapy: z
        .enum(Object.values(DIVISION_THERAPY))
        .openapi({ example: 'Cardiology' }),
    brandFocus: z.string().optional().openapi({ example: 'Atorvastatin+' }),
    mrCount: z.number().int().nonnegative().optional().openapi({ example: 38 }),
    // the division is created together with its head: a new user (registered inactive) linked to a
    // pharma-division-head role scoped to this division. Required — every division has a head.
    head: RegisterUserPayloadSchema,
});
export type ICreateDivisionPayload = z.infer<
    typeof CreateDivisionPayloadSchema
>;

//2: update ====================================>
export const UpdateDivisionPayloadSchema = z.object({
    name: z.string().min(1).optional().openapi({ example: 'Cardio Care' }),
    therapy: z
        .enum(Object.values(DIVISION_THERAPY))
        .optional()
        .openapi({ example: 'Cardiology' }),
    brandFocus: z.string().optional().openapi({ example: 'Atorvastatin+' }),
    mrCount: z.number().int().nonnegative().optional().openapi({ example: 38 }),
    status: z
        .enum([DIVISION_STATUS.ACTIVE, DIVISION_STATUS.INACTIVE])
        .optional()
        .openapi({ example: 'active' }),
});
export type IUpdateDivisionPayload = z.infer<
    typeof UpdateDivisionPayloadSchema
>;

//3: search ====================================>
export const SearchDivisionQuerySchema = z.object({
    tenant: z
        .string()
        .refine((val) => isValidObjectID(val), {
            message: 'tenant must be a valid ObjectId',
        })
        .optional()
        .openapi({ example: '64f0c2a1b3d4e5f6a7b8c9d0' }),
    // filter by the division head (owner) role id
    owner: z
        .string()
        .refine((val) => isValidObjectID(val), {
            message: 'owner must be a valid ObjectId',
        })
        .optional()
        .openapi({ example: '64f0c2a1b3d4e5f6a7b8c9d0' }),
    code: z.string().lowercase().optional().openapi({ example: 'sun-cardio' }),
    name: z.string().optional().openapi({ example: 'Cardio Care' }),
    therapy: z
        .enum(Object.values(DIVISION_THERAPY))
        .optional()
        .openapi({ example: 'cardiology' }),
    status: z
        .enum([DIVISION_STATUS.ACTIVE, DIVISION_STATUS.INACTIVE])
        .optional()
        .openapi({ example: 'active' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchDivisionQuery = z.infer<typeof SearchDivisionQuerySchema>;
