// Inventory-device Validators
import { z } from 'zod';
import { INVENTORY_DEVICE_STATUS } from './inventory-device.constants';

//1: create ====================================>
// item (catalog ref) and serialNumber (natural key) are immutable after create.
// vendor is the immutable ref to the VendorMaster this unit was purchased from.
export const CreateInventoryDevicePayloadSchema = z.object({
    item: z.string().min(1).openapi({ example: '665f1a2b3c4d5e6f70819293' }),
    vendor: z.string().min(1).openapi({ example: '665f1a2b3c4d5e6f70810001' }),
    serialNumber: z.string().min(1).openapi({ example: 'SN-ACGLU-000142' }),
    manufacturingDate: z.coerce.date().optional().openapi({ example: '2026-01-15' }),
    warrantyExpiryDate: z.coerce.date().optional().openapi({ example: '2028-01-15' }),
    lastCalibrationDate: z.coerce.date().optional().openapi({ example: '2026-06-01' }),
    nextCalibrationDate: z.coerce.date().optional().openapi({ example: '2026-12-01' }),
});
export type ICreateInventoryDevicePayload = z.infer<typeof CreateInventoryDevicePayloadSchema>;

//2: update ====================================>
// item and serialNumber are intentionally omitted — both are immutable after create.
export const UpdateInventoryDevicePayloadSchema = z.object({
    manufacturingDate: z.coerce.date().optional(),
    warrantyExpiryDate: z.coerce.date().optional(),
    status: z.enum(Object.values(INVENTORY_DEVICE_STATUS)).optional(),
    lastCalibrationDate: z.coerce.date().optional(),
    nextCalibrationDate: z.coerce.date().optional(),
});
export type IUpdateInventoryDevicePayload = z.infer<typeof UpdateInventoryDevicePayloadSchema>;

//3: search ====================================>
export const SearchInventoryDeviceQuerySchema = z.object({
    item: z.string().optional().openapi({ example: '665f1a2b3c4d5e6f70819293' }),
    vendor: z.string().optional().openapi({ example: '665f1a2b3c4d5e6f70810001' }),
    serialNumber: z.string().optional().openapi({ example: 'SN-ACGLU-000142' }),
    status: z.enum(Object.values(INVENTORY_DEVICE_STATUS)).optional().openapi({ example: 'available' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchInventoryDeviceQuery = z.infer<typeof SearchInventoryDeviceQuerySchema>;
