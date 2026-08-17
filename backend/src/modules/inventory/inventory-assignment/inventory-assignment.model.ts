// Inventory-assignment Model

import mongoose from 'mongoose';

const inventoryAssignmentSchema = new mongoose.Schema(
    {
        assignee: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'Assignee is required'],
            ref: 'Role',
            index: true,
        },
        inventoryType: {
            type: String,
            enum: ['InventoryDevice', 'InventoryConsumable'],
            required: [true, 'Inventory type is required'],
        },
        inventory: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'Inventory is required'],
            refPath: 'inventoryType',
            index: true,
        },
        quantity: {
            type: Number,
            required: [true, 'Quantity is required'],
            min: [1, 'Quantity must be at least 1'],
            default: 1,
        },
    },
    {
        timestamps: true,
    },
);

inventoryAssignmentSchema.index({ assignee: 1, inventoryType: 1, inventory: 1 }, { unique: true });

export const InventoryAssignmentModel = mongoose.model('InventoryAssignment', inventoryAssignmentSchema);
export type IInventoryAssignment = mongoose.InferSchemaType<typeof inventoryAssignmentSchema>;
