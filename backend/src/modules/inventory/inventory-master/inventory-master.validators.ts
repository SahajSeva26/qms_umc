// Inventory-master Validators
import { z } from 'zod';
import { ITEM_STATUS, ITEM_TYPES } from './inventory-master.constants';

//1: create ====================================>
// code is the natural key — required here, and never editable afterwards.
export const CreateInventoryMasterPayloadSchema = z.object({
    code: z.string().min(1).openapi({ example: 'DEV-GLUCO-01' }),
    name: z.string().min(1).openapi({ example: 'Accu-Chek Glucometer' }),
    description: z.string().min(1).openapi({ example: 'Blood glucose monitoring device' }),
    type: z.enum(Object.values(ITEM_TYPES)).optional().openapi({ example: 'device' }),
    sku: z.string().min(1).openapi({ example: 'ACGLU-001' }),
    unit: z.string().min(1).openapi({ example: 'piece' }),
    status: z.enum(Object.values(ITEM_STATUS)).optional().openapi({ example: 'active' }),
    minStock: z.number().min(0).optional().openapi({ example: 10 }),
    maxStock: z.number().min(0).optional().openapi({ example: 100 }),
});
export type ICreateInventoryMasterPayload = z.infer<typeof CreateInventoryMasterPayloadSchema>;

//2: update ====================================>
// code is intentionally omitted — it is immutable after create.
export const UpdateInventoryMasterPayloadSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    type: z.enum(Object.values(ITEM_TYPES)).optional(),
    sku: z.string().min(1).optional(),
    unit: z.string().min(1).optional(),
    status: z.enum(Object.values(ITEM_STATUS)).optional(),
    minStock: z.number().min(0).optional(),
    maxStock: z.number().min(0).optional(),
});
export type IUpdateInventoryMasterPayload = z.infer<typeof UpdateInventoryMasterPayloadSchema>;

//3: search ====================================>
export const SearchInventoryMasterQuerySchema = z.object({
    code: z.string().optional().openapi({ example: 'DEV-GLUCO-01' }),
    name: z.string().optional().openapi({ example: 'Glucometer' }),
    type: z.enum(Object.values(ITEM_TYPES)).optional().openapi({ example: 'device' }),
    sku: z.string().optional().openapi({ example: 'ACGLU-001' }),
    status: z.enum(Object.values(ITEM_STATUS)).optional().openapi({ example: 'active' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchInventoryMasterQuery = z.infer<typeof SearchInventoryMasterQuerySchema>;
