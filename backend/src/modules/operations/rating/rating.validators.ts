// Rating Validators
import { z } from 'zod';
import { isValidObjectID } from '../../../shared/utils/strings';

const objectId = (label: string) =>
    z.string().refine((val) => isValidObjectID(val), { message: `${label} must be a valid id` });

// each sub-score is 0..5 (matches the model); `overall` is NOT accepted — it is derived server-side.
const score = (label: string) => z.coerce.number().min(0).max(5).openapi({ example: 4 });

//1: create ====================================>
// tenant, worker (the camp's fo/dietitian) and ratedBy (the acting MR) are all derived from the camp
// + actor — never supplied. overall is derived from the three sub-scores.
export const CreateRatingPayloadSchema = z.object({
    camp: objectId('Camp').openapi({ example: '665f1a2b3c4d5e6f70819294' }),
    onTime: score('onTime'),
    attire: score('attire'),
    communication: score('communication'),
});
export type ICreateRatingPayload = z.infer<typeof CreateRatingPayloadSchema>;

//2: update ====================================>
// camp / worker / ratedBy / tenant are immutable; overall is re-derived from the sub-scores.
export const UpdateRatingPayloadSchema = z.object({
    onTime: score('onTime').optional(),
    attire: score('attire').optional(),
    communication: score('communication').optional(),
});
export type IUpdateRatingPayload = z.infer<typeof UpdateRatingPayloadSchema>;

//3: search ====================================>
export const SearchRatingQuerySchema = z.object({
    camp: z.string().optional().openapi({ example: '665f1a2b3c4d5e6f70819294' }),
    // the rated worker (camp's fo/dietitian)
    worker: z.string().optional().openapi({ example: '665f1a2b3c4d5e6f70819295' }),
    // the rater (the MR) — only honoured for a rating:manage actor; others are own-scoped
    ratedBy: z.string().optional().openapi({ example: '665f1a2b3c4d5e6f70819296' }),
    // only honoured for a rating:manage actor not already tenant-pinned
    tenant: z.string().optional().openapi({ example: '665f1a2b3c4d5e6f70819200' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchRatingQuery = z.infer<typeof SearchRatingQuerySchema>;
