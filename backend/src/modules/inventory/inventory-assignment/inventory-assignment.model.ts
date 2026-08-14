// Inventory-assignment Model

import mongoose from 'mongoose';
import { INVENTORY_ASSIGNMENT_STATUS } from './inventory-assignment.constants';

const inventoryAssignmentItemSchema = new mongoose.Schema(
    {
        inventory: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'Inventory is required'],
            refPath: 'inventoryPath',
        },
        inventoryPath: {
            type: String,
            required: [true, 'Inventory type is required'],
            enum: ['InventoryDevice', 'InventoryConsumable'],
        },
        quantity: {
            type: Number,
            required: [true, 'Quantity is required'],
            min: [1, 'Quantity must be at least 1'],
        },
    },
    {
        _id: false,
    },
);

const inventoryAssginmentSchema = new mongoose.Schema(
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
                    min: [1, 'Quantity must be at least 1'],
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

export const InventoryAssignmentModel = mongoose.model('InventoryAssignment', inventoryAssginmentSchema);
export type IInventoryAssignment = mongoose.InferSchemaType<typeof inventoryAssginmentSchema>;
