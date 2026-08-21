// Inventory-ledger Validators
import { z } from 'zod';
import { INVENTORY_LEDGER_ITEM_TYPE, INVENTORY_LEDGER_LOCATION } from './inventory-ledger.constants';
import { INVENTORY_REQUEST_TYPE } from '../inventory-request/inventory-request.constants';
import { isValidObjectID } from '../../../shared/utils/strings';

const objectId = (label: string) => z.string().refine((v) => isValidObjectID(v), { message: `${label} must be a valid id` });

//1: record ====================================>
// the ledger is written by the system (inventory-request service) inside a transaction, never by a
// client — so there is no create ROUTE. This schema just types/validates what record() accepts.
// actor is NOT here: record() snapshots it from ctx.
export const RecordInventoryLedgerPayloadSchema = z.object({
    request: objectId('Request'),
    requestType: z.enum(Object.values(INVENTORY_REQUEST_TYPE)),
    inventoryType: z.enum(Object.values(INVENTORY_LEDGER_ITEM_TYPE)),
    inventory: objectId('Inventory'),
    quantity: z.number().min(1),
    from: z.enum(Object.values(INVENTORY_LEDGER_LOCATION)),
    to: z.enum(Object.values(INVENTORY_LEDGER_LOCATION)),
    assignee: objectId('Assignee').optional(),
});
export type IRecordInventoryLedgerPayload = z.infer<typeof RecordInventoryLedgerPayloadSchema>;

//2: search ====================================>
export const SearchInventoryLedgerQuerySchema = z.object({
    request: objectId('Request').optional().openapi({ example: '665f1a2b3c4d5e6f70819293' }),
    requestType: z.enum(Object.values(INVENTORY_REQUEST_TYPE)).optional().openapi({ example: 'refill' }),
    inventoryType: z.enum(Object.values(INVENTORY_LEDGER_ITEM_TYPE)).optional().openapi({ example: 'InventoryDevice' }),
    inventory: objectId('Inventory').optional(),
    assignee: objectId('Assignee').optional(),
    from: z.enum(Object.values(INVENTORY_LEDGER_LOCATION)).optional().openapi({ example: 'warehouse' }),
    to: z.enum(Object.values(INVENTORY_LEDGER_LOCATION)).optional().openapi({ example: 'in-transit' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchInventoryLedgerQuery = z.infer<typeof SearchInventoryLedgerQuerySchema>;
