// Inventory-request Validators
import { z } from 'zod';
import { INVENTORY_REQUEST_ITEM_TYPE, INVENTORY_REQUEST_STATUS, INVENTORY_REQUEST_TYPE } from './inventory-request.constants';
import { isValidObjectID } from '../../../shared/utils/strings';

const objectId = (label: string) =>
    z.string().refine((val) => isValidObjectID(val), { message: `${label} must be a valid id` });

// A polymorphic request line: itemType is the model it points at, item is that record's id.
// quantity is only meaningful for master/consumable lines — a device line is always 1, forced in
// the service. The itemType↔request-type coherence rule (refill→master, return→device/consumable)
// is enforced in the service, not here.
const LineItemSchema = z.object({
    itemType: z.enum(Object.values(INVENTORY_REQUEST_ITEM_TYPE)).openapi({ example: 'InventoryMaster' }),
    item: objectId('Item').openapi({ example: '665f1a2b3c4d5e6f70819293' }),
    quantity: z.number().min(1).optional().openapi({ example: 10 }),
});

//1: create ====================================>
// requestedBy is NOT accepted here — it is auto-set to the creator (the field officer) in the service.
// A request must carry at least one line.
export const CreateInventoryRequestPayloadSchema = z.object({
    type: z.enum(Object.values(INVENTORY_REQUEST_TYPE)).openapi({ example: 'refill' }),
    lineItems: z.array(LineItemSchema).min(1, 'A request must include at least one item'),
});
export type ICreateInventoryRequestPayload = z.infer<typeof CreateInventoryRequestPayloadSchema>;

//2: update ====================================>
// type/status/requestedBy are intentionally omitted — type is immutable, status moves through moveStage().
// A supplied list replaces the existing one wholesale (must still be non-empty).
export const UpdateInventoryRequestPayloadSchema = z.object({
    lineItems: z.array(LineItemSchema).min(1, 'A request must include at least one item').optional(),
});
export type IUpdateInventoryRequestPayload = z.infer<typeof UpdateInventoryRequestPayloadSchema>;

//3: move stage ====================================>
// reuses the generic canTransition guard defined on the lead module
export const MoveStagePayloadSchema = z.object({
    to: z.enum(Object.values(INVENTORY_REQUEST_STATUS)).openapi({ example: 'approved' }),
    reason: z.string().min(1).openapi({ example: 'Stock available in warehouse' }),
});
export type IMoveStagePayload = z.infer<typeof MoveStagePayloadSchema>;

//4: search ====================================>
export const SearchInventoryRequestQuerySchema = z.object({
    type: z.enum(Object.values(INVENTORY_REQUEST_TYPE)).optional().openapi({ example: 'refill' }),
    status: z.enum(Object.values(INVENTORY_REQUEST_STATUS)).optional().openapi({ example: 'requested' }),
    requestedBy: objectId('Requested by').optional(),
    processedBy: objectId('Processed by').optional(),
    item: objectId('Item').optional(),
    itemType: z.enum(Object.values(INVENTORY_REQUEST_ITEM_TYPE)).optional().openapi({ example: 'InventoryMaster' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchInventoryRequestQuery = z.infer<typeof SearchInventoryRequestQuerySchema>;
