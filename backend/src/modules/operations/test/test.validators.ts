// Test Validators
import { z } from 'zod';
import { TEST_STATUS } from './test.constants';
import { PROJECT_THERAPY_TYPES } from '../../crm/project/project.constants';
import { isValidObjectID } from '../../../shared/utils/strings';

const objectId = (label: string) =>
    z.string().refine((val) => isValidObjectID(val), { message: `${label} must be a valid id` });

// One resource line: a catalog item (InventoryMaster) + quantity.
// For a device the quantity is a single unit (1); a consumable carries an explicit amount.
const ResourceLineSchema = z.object({
    item: objectId('Item').openapi({ example: '665f1a2b3c4d5e6f70819293' }),
    quantity: z.number().min(1).optional().openapi({ example: 1 }),
});

//1: create ====================================>
// code is the natural key — required here, and never editable afterwards.
export const CreateTestPayloadSchema = z.object({
    code: z.string().min(1).openapi({ example: 'TST-BSL-01' }),
    name: z.string().min(1).openapi({ example: 'Blood Sugar (Fasting)' }),
    description: z.string().min(1).optional().openapi({ example: 'Fasting blood glucose screening' }),
    therapy: z.enum(Object.values(PROJECT_THERAPY_TYPES)).openapi({ example: 'diabetes' }),
    status: z.enum(Object.values(TEST_STATUS)).optional().openapi({ example: 'active' }),
    config: z.record(z.string(), z.unknown()).optional().openapi({ example: { unit: 'mg/dL' } }),
    resourceRequired: z.array(ResourceLineSchema).optional(),
    resourceConsumption: z.array(ResourceLineSchema).optional(),
});
export type ICreateTestPayload = z.infer<typeof CreateTestPayloadSchema>;

//2: update ====================================>
// code is intentionally omitted — it is immutable after create.
export const UpdateTestPayloadSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    therapy: z.enum(Object.values(PROJECT_THERAPY_TYPES)).optional(),
    status: z.enum(Object.values(TEST_STATUS)).optional(),
    config: z.record(z.string(), z.unknown()).optional(),
    resourceRequired: z.array(ResourceLineSchema).optional(),
    resourceConsumption: z.array(ResourceLineSchema).optional(),
});
export type IUpdateTestPayload = z.infer<typeof UpdateTestPayloadSchema>;

//3: search ====================================>
export const SearchTestQuerySchema = z.object({
    code: z.string().optional().openapi({ example: 'TST-BSL-01' }),
    name: z.string().optional().openapi({ example: 'Blood Sugar' }),
    // accept a single therapy OR a list (→ $in), so callers can pull every test belonging to a
    // group of therapies (e.g. a division spanning cardiology + diabetes) in one query.
    therapy: z
        .union([z.enum(Object.values(PROJECT_THERAPY_TYPES)), z.array(z.enum(Object.values(PROJECT_THERAPY_TYPES)))])
        .optional()
        .openapi({ example: ['cardiology', 'diabetes'] }),
    status: z.enum(Object.values(TEST_STATUS)).optional().openapi({ example: 'active' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchTestQuery = z.infer<typeof SearchTestQuerySchema>;
