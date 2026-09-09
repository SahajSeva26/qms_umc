import { z } from 'zod';
import { BRAND_STATUS } from './brand.constants';
import { isValidObjectID } from '../../../shared/utils/strings';

const objectId = (label: string) =>
    z.string().refine((val) => isValidObjectID(val), { message: `${label} must be a valid id` });

//1: create ====================================>
// tenant is NOT accepted — the service derives it from the division (the pharma company,
// source of truth). A caller only picks the division; the division decides the tenant.
export const CreateBrandPayloadSchema = z.object({
    division: objectId('Division').openapi({ example: '665f0c3a1a2b3c4d5e6f7a8b' }),
    name: z.string().min(1).openapi({ example: 'Cardace' }),
    description: z.string().optional().openapi({ example: 'ACE inhibitor for hypertension' }),
    molecule: z.string().optional().openapi({ example: 'Ramipril' }),
    notes: z.string().optional().openapi({ example: 'Flagship cardiac brand' }),
    color: z.string().optional().openapi({ example: '#3b6dff' }),
});
export type ICreateBrandPayload = z.infer<typeof CreateBrandPayloadSchema>;

//2: update ====================================>
// tenant and division are NOT editable — a brand never changes the company/division it belongs to.
export const UpdateBrandPayloadSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    molecule: z.string().optional(),
    notes: z.string().optional(),
    color: z.string().optional(),
    status: z.enum(Object.values(BRAND_STATUS)).optional(),
});
export type IUpdateBrandPayload = z.infer<typeof UpdateBrandPayloadSchema>;

//3: search ====================================>
export const SearchBrandQuerySchema = z.object({
    name: z.string().optional().openapi({ example: 'Cardace' }),
    status: z.enum(Object.values(BRAND_STATUS)).optional().openapi({ example: 'active' }),
    // only honoured for platform staff; customer users stay pinned to their own tenant
    tenant: objectId('Tenant').optional().openapi({ example: '665f0c3a1a2b3c4d5e6f7a8a' }),
    // filter to a specific division within the tenant
    division: objectId('Division').optional().openapi({ example: '665f0c3a1a2b3c4d5e6f7a8b' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchBrandQuery = z.infer<typeof SearchBrandQuerySchema>;
