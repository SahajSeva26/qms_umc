// Inventory-request Validators
import { z } from 'zod';
import { INVENTORY_REQUEST_STATUS, INVENTORY_REQUEST_TYPE } from './inventory-request.constants';
import { isValidObjectID } from '../../../shared/utils/strings';

const objectId = (label: string) =>
    z.string().refine((val) => isValidObjectID(val), { message: `${label} must be a valid id` });

// A device line carries no quantity — a device is a single physical unit, so it is always 1
// (enforced in the model). Only the device ref is supplied.
const DeviceLineSchema = z.object({
    item: objectId('Device').openapi({ example: '665f1a2b3c4d5e6f70819293' }),
});

// A consumable line is a requested quantity of a consumable stock lot.
const ConsumableLineSchema = z.object({
    item: objectId('Consumable').openapi({ example: '665f1a2b3c4d5e6f70819294' }),
    quantity: z.number().min(1).openapi({ example: 10 }),
});

//1: create ====================================>
// requestedBy is NOT accepted here — it is auto-set to the creator (the field officer) in the service.
// A request must carry at least one device or consumable line.
export const CreateInventoryRequestPayloadSchema = z
    .object({
        type: z.enum(Object.values(INVENTORY_REQUEST_TYPE)).openapi({ example: 'refill' }),
        devices: z.array(DeviceLineSchema).optional(),
        consumables: z.array(ConsumableLineSchema).optional(),
    })
    .refine((data) => (data.devices?.length || 0) + (data.consumables?.length || 0) > 0, {
        message: 'A request must include at least one device or consumable',
        path: ['devices'],
    });
export type ICreateInventoryRequestPayload = z.infer<typeof CreateInventoryRequestPayloadSchema>;

//2: update ====================================>
// type/status/requestedBy are intentionally omitted — type is immutable, status moves through moveStage().
// A supplied list replaces the existing one wholesale.
export const UpdateInventoryRequestPayloadSchema = z.object({
    devices: z.array(DeviceLineSchema).optional(),
    consumables: z.array(ConsumableLineSchema).optional(),
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
    device: objectId('Device').optional(),
    consumable: objectId('Consumable').optional(),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchInventoryRequestQuery = z.infer<typeof SearchInventoryRequestQuerySchema>;
