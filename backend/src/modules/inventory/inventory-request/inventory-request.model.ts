// Inventory-request Model
import mongoose from 'mongoose';
import { INVENTORY_REQUEST_STATUS, INVENTORY_REQUEST_TYPE } from './inventory-request.constants';

// lead status transition
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
        // Requested devices
        devices: [
            {
                item: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'InventoryDevice',
                    required: true,
                },

                quantity: {
                    type: Number,
                    required: true,
                    min: 1,
                    max: 1,
                    default: 1,
                },
            },
        ],
        consumables: [
            {
                item: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'InventoryConsumable',
                    required: true,
                },

                quantity: {
                    type: Number,
                    required: true,
                    min: 1,
                    default: 1,
                },
            },
        ],

        status: {
            type: String,
            enum: Object.values(INVENTORY_REQUEST_STATUS),
            default: INVENTORY_REQUEST_STATUS.REQUESTED,
        },
        stageHistory: [stageHistorySchema],
    },
    {
        timestamps: true,
    },
);

export const InventoryRequestModel = mongoose.model('InventoryRequest', inventoryRequestSchema);
export type IInventoryRequest = mongoose.InferSchemaType<typeof inventoryRequestSchema>;
