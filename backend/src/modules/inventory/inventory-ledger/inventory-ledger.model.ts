// Inventory-ledger Model
import mongoose from 'mongoose';
import { INVENTORY_LEDGER_ITEM_TYPE, INVENTORY_LEDGER_LOCATION } from './inventory-ledger.constants';
import { INVENTORY_REQUEST_TYPE } from '../inventory-request/inventory-request.constants';

// An append-only record of a single stock movement (from → to). One row per device/lot moved.
// Written only by the system (the inventory-request service, inside its transaction) — never edited
// or deleted.
const inventoryLedgerSchema = new mongoose.Schema(
    {
        // the request whose stage transition caused this movement
        request: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'InventoryRequest',
            required: true,
            index: true,
        },
        requestType: {
            type: String,
            enum: Object.values(INVENTORY_REQUEST_TYPE),
            required: true,
        },
        // the concrete stock that moved
        inventoryType: {
            type: String,
            enum: Object.values(INVENTORY_LEDGER_ITEM_TYPE),
            required: true,
        },
        inventory: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'inventoryType',
            required: true,
            index: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        // movement direction
        from: {
            type: String,
            enum: Object.values(INVENTORY_LEDGER_LOCATION),
            required: true,
        },
        to: {
            type: String,
            enum: Object.values(INVENTORY_LEDGER_LOCATION),
            required: true,
        },
        // the field officer on the FO side of the movement
        assignee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
            index: true,
        },
        // frozen snapshot of who performed the movement (stays true even if the user/role later changes)
        actor: {
            roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
            name: { type: String },
            email: { type: String },
        },
    },
    { timestamps: true },
);

export const InventoryLedgerModel = mongoose.model('InventoryLedger', inventoryLedgerSchema);
export type IInventoryLedger = mongoose.InferSchemaType<typeof inventoryLedgerSchema>;
