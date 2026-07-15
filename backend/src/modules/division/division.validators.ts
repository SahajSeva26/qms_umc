import { z } from 'zod';
import { DIVISION_STATUS, DIVISION_THERAPY } from './division.constants';
import { isValidObjectID } from '../../shared/utils/strings';

//1: create ====================================>
export const CreateDivisionPayloadSchema = z.object({
    code: z
        .string()
        .min(3)
        .lowercase()
        .refine((val) => !isValidObjectID(val), {
            message: 'Code must not be an ObjectId',
        })
        .openapi({ example: 'sun-cardio' }),
    name: z.string().min(1).openapi({ example: 'Cardio Care' }),
    therapy: z.enum(Object.values(DIVISION_THERAPY)).openapi({ example: 'Cardiology' }),
    brandFocus: z.string().optional().openapi({ example: 'Atorvastatin+' }),
    mrCount: z.number().int().nonnegative().optional().openapi({ example: 38 }),
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
    code: z.string().lowercase().optional().openapi({ example: 'sun-cardio' }),
    name: z.string().optional().openapi({ example: 'Cardio Care' }),
    therapy: z
        .enum(Object.values(DIVISION_THERAPY))
        .optional()
        .openapi({ example: 'Cardiology' }),
    status: z
        .enum([DIVISION_STATUS.ACTIVE, DIVISION_STATUS.INACTIVE])
        .optional()
        .openapi({ example: 'active' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchDivisionQuery = z.infer<typeof SearchDivisionQuerySchema>;
