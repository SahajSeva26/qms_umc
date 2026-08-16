// Inventory-assignment Validators
import { z } from 'zod';

// A device line carries no quantity — a device is a single physical unit, so it is always 1
// (enforced in the model). Only the device ref is supplied.
const DeviceLineSchema = z.object({
    inventory: z.string().min(1).openapi({ example: '665f1a2b3c4d5e6f70819293' }),
});

// A consumable line is a stock quantity of a consumable lot.
const ConsumableLineSchema = z.object({
    inventory: z.string().min(1).openapi({ example: '665f1a2b3c4d5e6f70819294' }),
    quantity: z.number().min(1).openapi({ example: 10 }),
});

//1: create ====================================>
// assignee (the Role holding the inventory) is immutable after create — one assignment per assignee.
export const CreateInventoryAssignmentPayloadSchema = z.object({
    assignee: z.string().min(1).openapi({ example: '665f1a2b3c4d5e6f70819291' }),
    devices: z.array(DeviceLineSchema).optional(),
    consumables: z.array(ConsumableLineSchema).optional(),
});
export type ICreateInventoryAssignmentPayload = z.infer<typeof CreateInventoryAssignmentPayloadSchema>;

//2: update ====================================>
// assignee is intentionally omitted — it is immutable. A supplied list replaces the existing one wholesale.
export const UpdateInventoryAssignmentPayloadSchema = z.object({
    devices: z.array(DeviceLineSchema).optional(),
    consumables: z.array(ConsumableLineSchema).optional(),
});
export type IUpdateInventoryAssignmentPayload = z.infer<typeof UpdateInventoryAssignmentPayloadSchema>;

//3: search ====================================>
export const SearchInventoryAssignmentQuerySchema = z.object({
    assignee: z.string().optional().openapi({ example: '665f1a2b3c4d5e6f70819291' }),
    device: z.string().optional().openapi({ example: '665f1a2b3c4d5e6f70819293' }),
    consumable: z.string().optional().openapi({ example: '665f1a2b3c4d5e6f70819294' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchInventoryAssignmentQuery = z.infer<typeof SearchInventoryAssignmentQuerySchema>;
