// Inventory-assignment Model

import mongoose from 'mongoose';

const inventoryAssignmentSchema = new mongoose.Schema(
    {
        assignee: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'Assignee is required'],
            ref: 'Role',
            unique: true,
            index: true,
        },

        devices: [
            {
                inventory: {
                    type: mongoose.Schema.Types.ObjectId,
                    required: [true, 'Inventory is required'],
                    ref: 'InventoryDevice',
                },

                quantity: {
                    type: Number,
                    required: [true, 'Quantity is required'],
                    min: [1, 'Quantity must be 1'],
                    max: [1, 'Quantity must be 1'],
                    default: 1,
                },
            },
        ],

        consumables: [
            {
                inventory: {
                    type: mongoose.Schema.Types.ObjectId,
                    required: [true, 'Inventory is required'],
                    ref: 'InventoryConsumable',
                },

                quantity: {
                    type: Number,
                    required: [true, 'Quantity is required'],
                    min: [1, 'Quantity must be at least 1'],
                },
            },
        ],
    },
    {
        timestamps: true,
    },
);

export const InventoryAssignmentModel = mongoose.model('InventoryAssignment', inventoryAssignmentSchema);
export type IInventoryAssignment = mongoose.InferSchemaType<typeof inventoryAssignmentSchema>;
