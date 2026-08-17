// Inventory-consumable Model

import mongoose from 'mongoose';
import { INVENTORY_CONSUMABLE_STATUS } from './inventory-consumable.constants';

const inventoryConsumableSchema = new mongoose.Schema(
    {
        item: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'InventoryMaster',
            required: true,
            index: true,
        },
        batch: {
            type: String,
            required: true,
            trim: true,
        },
        manufacturingDate: {
            type: Date,
            required: true,
        },
        expiryDate: {
            type: Date,
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        status: {
            type: String,
            enum: Object.values(INVENTORY_CONSUMABLE_STATUS),
            default: INVENTORY_CONSUMABLE_STATUS.ACTIVE,
            required: true,
        },
    },
    { timestamps: true },
);

// a lot's identity is (item, batch) — the same catalog item can have many batches, but a given
// (item, batch) pair is unique. This backs the create() dedup guard.
inventoryConsumableSchema.index({ item: 1, batch: 1 }, { unique: true });

export const InventoryConsumableModel = mongoose.model('InventoryConsumable', inventoryConsumableSchema);
export type IInventoryConsumable = mongoose.InferSchemaType<typeof inventoryConsumableSchema>;
