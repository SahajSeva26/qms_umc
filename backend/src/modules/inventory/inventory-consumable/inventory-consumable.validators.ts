// Inventory-consumable Validators
import { z } from 'zod';
import { INVENTORY_CONSUMABLE_STATUS } from './inventory-consumable.constants';

//1: create ====================================>
// item is the immutable ref to the InventoryMaster catalog record this lot is stock of.
// vendor is the immutable ref to the VendorMaster this lot was purchased from.
export const CreateInventoryConsumablePayloadSchema = z.object({
    item: z.string().min(1).openapi({ example: '665f1a2b3c4d5e6f70819293' }),
    vendor: z.string().min(1).openapi({ example: '665f1a2b3c4d5e6f70810001' }),
    batch: z.string().min(1).openapi({ example: 'BATCH-2026-014' }),
    manufacturingDate: z.coerce.date().openapi({ example: '2026-01-15' }),
    expiryDate: z.coerce.date().openapi({ example: '2027-01-15' }),
    quantity: z.number().min(0).optional().openapi({ example: 100 }),
});
export type ICreateInventoryConsumablePayload = z.infer<typeof CreateInventoryConsumablePayloadSchema>;

//2: update ====================================>
// item is intentionally omitted — a lot never changes which catalog item it is stock of.
export const UpdateInventoryConsumablePayloadSchema = z.object({
    batch: z.string().min(1).optional(),
    manufacturingDate: z.coerce.date().optional(),
    expiryDate: z.coerce.date().optional(),
    quantity: z.number().min(0).optional(),
    status: z.enum(Object.values(INVENTORY_CONSUMABLE_STATUS)).optional(),
});
export type IUpdateInventoryConsumablePayload = z.infer<typeof UpdateInventoryConsumablePayloadSchema>;

//3: search ====================================>
export const SearchInventoryConsumableQuerySchema = z.object({
    item: z.string().optional().openapi({ example: '665f1a2b3c4d5e6f70819293' }),
    vendor: z.string().optional().openapi({ example: '665f1a2b3c4d5e6f70810001' }),
    batch: z.string().optional().openapi({ example: 'BATCH-2026-014' }),
    status: z.enum(Object.values(INVENTORY_CONSUMABLE_STATUS)).optional().openapi({ example: 'active' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchInventoryConsumableQuery = z.infer<typeof SearchInventoryConsumableQuerySchema>;
