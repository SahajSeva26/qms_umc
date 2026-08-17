// Inventory-device Model

import mongoose from 'mongoose';

import { INVENTORY_DEVICE_LOCATION, INVENTORY_DEVICE_STATUS } from './inventory-device.constants';

const inventoryDeviceSchema = new mongoose.Schema(
    {
        item: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'InventoryMaster',
            required: true,
            index: true,
        },
        serialNumber: {
            type: String,
            required: true,
            trim: true,
            unique: true,
        },
        location: {
            type: String,
            enum: Object.values(INVENTORY_DEVICE_LOCATION),
            default: INVENTORY_DEVICE_LOCATION.WAREHOUSE,
            required: true,
        },
        manufacturingDate: {
            type: Date,
        },
        warrantyExpiryDate: {
            type: Date,
        },
        status: {
            type: String,
            enum: Object.values(INVENTORY_DEVICE_STATUS),
            default: INVENTORY_DEVICE_STATUS.AVAILABLE,
            required: true,
        },
        // Calibration information
        lastCalibrationDate: {
            type: Date,
        },
        nextCalibrationDate: {
            type: Date,
        },
    },
    {
        timestamps: true,
    },
);

export const InventoryDeviceModel = mongoose.model('InventoryDevice', inventoryDeviceSchema);
export type IInventoryDevice = mongoose.InferSchemaType<typeof inventoryDeviceSchema>;
