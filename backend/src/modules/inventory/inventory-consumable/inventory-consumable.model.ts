// Inventory-consumable Model

import mongoose from 'mongoose';

const inventoryConsumableSchema = new mongoose.Schema({
    // Add your schema fields here
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InventoryMaster',
        required: true,
    },
    location: {
        type: String,
        enum: ['warehouse', 'camp'],
        required: true,
    },
});

export const InventoryConsumable = mongoose.model('InventoryConsumable', inventoryConsumableSchema);
export type IInventoryConsumable = mongoose.InferSchemaType<typeof inventoryConsumableSchema>;
