// TestMaster Validators
import { z } from 'zod';
import { TEST_MASTER_STATUS, TEST_MASTER_CONFIG_INPUT_TYPE } from './testMaster.constants';
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

// config mirrors the model's `config.inputs[]` shape exactly — a list of input fields the
// field officer fills in when running the test. `options` only matter for a `select` input.
const ConfigOptionSchema = z.object({
    label: z.string().min(1).openapi({ example: 'Positive' }),
    value: z.string().min(1).openapi({ example: 'positive' }),
});

const ConfigInputSchema = z.object({
    label: z.string().min(1).openapi({ example: 'Blood Sugar Level' }),
    type: z.enum(Object.values(TEST_MASTER_CONFIG_INPUT_TYPE)).openapi({ example: 'number' }),
    unit: z.string().optional().openapi({ example: 'mg/dL' }),
    options: z.array(ConfigOptionSchema).optional(),
});

const TestMasterConfigSchema = z.object({
    inputs: z.array(ConfigInputSchema).optional(),
});

//1: create ====================================>
// code is auto-generated from the global `test-master` counter (tst-000001) — never supplied
// by the caller, and never editable afterwards.
export const CreateTestMasterPayloadSchema = z.object({
    name: z.string().min(1).openapi({ example: 'Blood Sugar (Fasting)' }),
    description: z.string().min(1).optional().openapi({ example: 'Fasting blood glucose screening' }),
    therapy: z.enum(Object.values(PROJECT_THERAPY_TYPES)).openapi({ example: 'diabetes' }),
    // time taken to perform the test, in minutes
    duration: z.number().min(0).openapi({ example: 15 }),
    // price of the test
    price: z.number().min(0).openapi({ example: 250 }),
    status: z.enum(Object.values(TEST_MASTER_STATUS)).optional().openapi({ example: 'active' }),
    config: TestMasterConfigSchema.optional(),
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
    config: TestMasterConfigSchema.optional(),
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
