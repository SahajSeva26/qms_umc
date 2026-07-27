// Counter Validators
import { z } from 'zod';
import { COUNTER_STATUSES } from './counter.constants';

//1: create ====================================>
// entity is the natural key — required here, and never editable afterwards.
export const CreateCounterPayloadSchema = z.object({
    entity: z.string().min(1).openapi({ example: 'lead' }),
    prefix: z.string().min(1).openapi({ example: 'LEAD' }),
    suffix: z.string().optional().openapi({ example: '' }),
    separator: z.string().optional().openapi({ example: '-' }),
    padding: z.number().int().min(1).optional().openapi({ example: 6 }),
    format: z.string().optional().openapi({ example: '{{prefix}}{{separator}}{{number}}' }),
    currentValue: z.number().int().min(0).optional().openapi({ example: 0 }),
    status: z.enum(Object.values(COUNTER_STATUSES)).optional().openapi({ example: 'active' }),
    description: z.string().optional().openapi({ example: 'Sequential code for leads' }),
});
export type ICreateCounterPayload = z.infer<typeof CreateCounterPayloadSchema>;

//2: update ====================================>
// entity is intentionally omitted — it is the immutable natural key. currentValue IS
// updatable so other services can set the running sequence.
export const UpdateCounterPayloadSchema = z.object({
    prefix: z.string().min(1).optional(),
    suffix: z.string().optional(),
    separator: z.string().optional(),
    padding: z.number().int().min(1).optional(),
    format: z.string().optional(),
    currentValue: z.number().int().min(0).optional(),
    status: z.enum(Object.values(COUNTER_STATUSES)).optional(),
    description: z.string().optional(),
});
export type IUpdateCounterPayload = z.infer<typeof UpdateCounterPayloadSchema>;

//3: search ====================================>
export const SearchCounterQuerySchema = z.object({
    entity: z.string().optional().openapi({ example: 'lead' }),
    prefix: z.string().optional().openapi({ example: 'LEAD' }),
    status: z.enum(Object.values(COUNTER_STATUSES)).optional().openapi({ example: 'active' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchCounterQuery = z.infer<typeof SearchCounterQuerySchema>;
