// Inventory-assignment Validators
import { z } from 'zod';
import { INVENTORY_ASSIGNMENT_TYPES } from './inventory-assignment.constants';
import { isValidObjectID } from '../../../shared/utils/strings';

const objectId = (label: string) =>
    z.string().refine((val) => isValidObjectID(val), { message: `${label} must be a valid id` });

//1: create ====================================>
// One holding row: an assignee (field officer) holds `quantity` of one inventory item.
// A device is a single physical unit, so its quantity is forced to 1 in the service — omit it.
// A consumable must carry an explicit quantity.
export const CreateInventoryAssignmentPayloadSchema = z.object({
    assignee: objectId('Assignee').openapi({ example: '665f1a2b3c4d5e6f70819291' }),
    inventoryType: z
        .enum(Object.values(INVENTORY_ASSIGNMENT_TYPES))
        .openapi({ example: INVENTORY_ASSIGNMENT_TYPES.DEVICE }),
    inventory: objectId('Inventory').openapi({ example: '665f1a2b3c4d5e6f70819293' }),
    quantity: z.number().min(1).optional().openapi({ example: 10 }),
});
export type ICreateInventoryAssignmentPayload = z.infer<typeof CreateInventoryAssignmentPayloadSchema>;

//2: update ====================================>
// Only the quantity is mutable — the identity (assignee + inventoryType + inventory) is immutable.
export const UpdateInventoryAssignmentPayloadSchema = z.object({
    quantity: z.number().min(1).openapi({ example: 5 }),
});
export type IUpdateInventoryAssignmentPayload = z.infer<typeof UpdateInventoryAssignmentPayloadSchema>;

//3: search ====================================>
export const SearchInventoryAssignmentQuerySchema = z.object({
    assignee: objectId('Assignee').optional().openapi({ example: '665f1a2b3c4d5e6f70819291' }),
    inventoryType: z
        .enum(Object.values(INVENTORY_ASSIGNMENT_TYPES))
        .optional()
        .openapi({ example: INVENTORY_ASSIGNMENT_TYPES.DEVICE }),
    inventory: objectId('Inventory').optional().openapi({ example: '665f1a2b3c4d5e6f70819293' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchInventoryAssignmentQuery = z.infer<typeof SearchInventoryAssignmentQuerySchema>;
