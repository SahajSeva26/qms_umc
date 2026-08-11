// Inventory-master Model
import { ITEM_STATUS, ITEM_TYPES } from './inventory-master.constants';
import mongoose from 'mongoose';

const inventoryMasterSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            unique: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: Object.values(ITEM_TYPES),
            default: ITEM_TYPES.DEVICE,
            required: true,
            trim: true,
        },

        sku: {
            type: String,
            required: true,
            trim: true,
        },
        unit: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        status: {
            type: String,
            default: ITEM_STATUS.ACTIVE,
            enum: Object.values(ITEM_STATUS),
            required: true,
            trim: true,
        },

        minStock: {
            type: Number,
            default: 0,
        },
        maxStock: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true },
);

export const InventoryMaster = mongoose.model('InventoryMaster', inventoryMasterSchema);
export type IInventoryMaster = mongoose.InferSchemaType<typeof inventoryMasterSchema>;
