// Inventory-request Model
import mongoose from 'mongoose';
import { INVENTORY_REQUEST_ITEM_TYPE, INVENTORY_REQUEST_STATUS, INVENTORY_REQUEST_TYPE } from './inventory-request.constants';

// append-only stage-transition journal entry
const stageHistorySchema = new mongoose.Schema({
    from: {
        type: String,
        enum: Object.values(INVENTORY_REQUEST_STATUS),
        required: [true, 'From status is required'],
    },
    to: {
        type: String,
        enum: Object.values(INVENTORY_REQUEST_STATUS),
        required: [true, 'To status is required'],
    },
    // frozen snapshot of the actor at the moment of the transition — immutable audit trail.
    // roleId/userId stay linkable; name/email never change even if the user/role later does.
    actor: {
        roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
        name: { type: String },
        email: { type: String },
    },
    reason: {
        type: String,
        required: [true, 'Reason is required'],
    },
});

// ---------------------------------------------
// Request Line Item
// ---------------------------------------------
const lineItemSchema = new mongoose.Schema(
    {
        itemType: {
            type: String,
            enum: Object.values(INVENTORY_REQUEST_ITEM_TYPE),
            required: [true, 'Inventory type is required'],
        },
        item: {
            type: mongoose.Schema.Types.ObjectId,
            // full path from the parent — for an array of subdocs, refPath must be 'lineItems.itemType',
            // not the relative 'itemType', or populate silently resolves nothing.
            refPath: 'lineItems.itemType',
            required: [true, 'Item is required'],
        },

        quantity: {
            type: Number,
            required: [true, 'Quantity is required'],
            min: [1, 'Quantity must be at least 1'],
            default: 1,
        },
    },
    {
        _id: false,
    },
);
export const inventoryRequestSchema = new mongoose.Schema(
    {
        requestedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
            required: true,
        },
        processedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
        },
        type: {
            type: String,
            enum: Object.values(INVENTORY_REQUEST_TYPE),
            required: true,
        },
        lineItems: {
            type: [lineItemSchema],
            required: true,

            validate: {
                validator: (items: unknown[]) => items.length > 0,
                message: 'At least one inventory item is required',
            },
        },

        status: {
            type: String,
            enum: Object.values(INVENTORY_REQUEST_STATUS),
            default: INVENTORY_REQUEST_STATUS.REQUESTED,
            required: true,
        },
        stageHistory: [stageHistorySchema],
    },
    {
        timestamps: true,
    },
);

export const InventoryRequestModel = mongoose.model('InventoryRequest', inventoryRequestSchema);
export type IInventoryRequest = mongoose.InferSchemaType<typeof inventoryRequestSchema>;
