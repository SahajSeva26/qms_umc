// TestMaster Validators
import { z } from 'zod';
import { TEST_MASTER_STATUS } from './testMaster.constants';
import { PROJECT_THERAPY_TYPES } from '../../crm/project/project.constants';
import { isValidObjectID } from '../../../shared/utils/strings';

const objectId = (label: string) =>
    z.string().refine((val) => isValidObjectID(val), { message: `${label} must be a valid id` });

// One consumption line: a catalog item (InventoryMaster) + the rate at which running
// this test reduces that item from the field officer's stock.
const ConsumptionLineSchema = z.object({
    item: objectId('Item').openapi({ example: '665f1a2b3c4d5e6f70819293' }),
    rate: z.number().min(1).optional().openapi({ example: 1 }),
});

//1: create ====================================>
// code is the natural key — required here, and never editable afterwards.
export const CreateTestMasterPayloadSchema = z.object({
    code: z.string().min(1).openapi({ example: 'TST-BSL-01' }),
    name: z.string().min(1).openapi({ example: 'Blood Sugar (Fasting)' }),
    description: z.string().min(1).optional().openapi({ example: 'Fasting blood glucose screening' }),
    therapy: z.enum(Object.values(PROJECT_THERAPY_TYPES)).openapi({ example: 'diabetes' }),
    // time taken to perform the test, in minutes
    duration: z.number().min(0).openapi({ example: 15 }),
    // price of the test
    price: z.number().min(0).openapi({ example: 250 }),
    status: z.enum(Object.values(TEST_MASTER_STATUS)).optional().openapi({ example: 'active' }),
    config: z.record(z.string(), z.unknown()).optional().openapi({ example: { unit: 'mg/dL' } }),
    consumption: z.array(ConsumptionLineSchema).optional(),
});
export type ICreateTestMasterPayload = z.infer<typeof CreateTestMasterPayloadSchema>;

//2: update ====================================>
// code is intentionally omitted — it is immutable after create.
export const UpdateTestMasterPayloadSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    therapy: z.enum(Object.values(PROJECT_THERAPY_TYPES)).optional(),
    duration: z.number().min(0).optional(),
    price: z.number().min(0).optional(),
    status: z.enum(Object.values(TEST_MASTER_STATUS)).optional(),
    config: z.record(z.string(), z.unknown()).optional(),
    consumption: z.array(ConsumptionLineSchema).optional(),
});
export type IUpdateTestMasterPayload = z.infer<typeof UpdateTestMasterPayloadSchema>;

//3: search ====================================>
export const SearchTestMasterQuerySchema = z.object({
    code: z.string().optional().openapi({ example: 'TST-BSL-01' }),
    name: z.string().optional().openapi({ example: 'Blood Sugar' }),
    // accept a single therapy OR a list (→ $in), so callers can pull every test belonging to a
    // group of therapies (e.g. a division spanning cardiology + diabetes) in one query.
    therapy: z
        .union([z.enum(Object.values(PROJECT_THERAPY_TYPES)), z.array(z.enum(Object.values(PROJECT_THERAPY_TYPES)))])
        .optional()
        .openapi({ example: ['cardiology', 'diabetes'] }),
    status: z.enum(Object.values(TEST_MASTER_STATUS)).optional().openapi({ example: 'active' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchTestMasterQuery = z.infer<typeof SearchTestMasterQuerySchema>;
