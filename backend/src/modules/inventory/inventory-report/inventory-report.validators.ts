import { z } from 'zod';

export const InventoryReportQuerySchema = z.object({});
export type IInventoryReportQuery = z.infer<typeof InventoryReportQuerySchema>;
