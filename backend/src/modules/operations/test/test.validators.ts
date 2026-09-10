// Test Validators
import { z } from 'zod';
import { TEST_INTERPRETATION } from './test.constants';
import { isValidObjectID } from '../../../shared/utils/strings';

const objectId = (label: string) =>
    z.string().refine((val) => isValidObjectID(val), { message: `${label} must be a valid id` });

// a single captured result value. interpretation is optional (a clinical band, when known).
const ResultSchema = z.object({
    key: z.string().min(1).openapi({ example: 'Blood Sugar Level' }),
    value: z.string().min(1).openapi({ example: '142' }),
    unit: z.string().min(1).openapi({ example: 'mg/dL' }),
    interpretation: z.enum(Object.values(TEST_INTERPRETATION)).optional().openapi({ example: 'HIGH' }),
});

//1: create ====================================>
// tenant + performedBy are derived server-side (tenant from the screening, performedBy = the actor).
// The screening must be completed and the actor must be the assigned field officer of its camp.
export const CreateTestPayloadSchema = z.object({
    screening: objectId('Screening').openapi({ example: '665f1a2b3c4d5e6f70819293' }),
    type: objectId('Test master').openapi({ example: '665f1a2b3c4d5e6f70819294' }),
    result: ResultSchema,
});
export type ICreateTestPayload = z.infer<typeof CreateTestPayloadSchema>;

//2: update ====================================>
// only the result is editable; screening / type / tenant / performedBy are immutable.
export const UpdateTestPayloadSchema = z.object({
    result: ResultSchema.optional(),
});
export type IUpdateTestPayload = z.infer<typeof UpdateTestPayloadSchema>;

//3: search ====================================>
export const SearchTestQuerySchema = z.object({
    screening: z.string().optional().openapi({ example: '665f1a2b3c4d5e6f70819293' }),
    type: z.string().optional().openapi({ example: '665f1a2b3c4d5e6f70819294' }),
    interpretation: z.enum(Object.values(TEST_INTERPRETATION)).optional().openapi({ example: 'HIGH' }),
    // only honoured for a test:manage actor not already tenant-pinned
    tenant: z.string().optional().openapi({ example: '665f1a2b3c4d5e6f70819200' }),
    page: z.string().optional().openapi({ example: '1' }),
    limit: z.string().optional().openapi({ example: '10' }),
});
export type ISearchTestQuery = z.infer<typeof SearchTestQuerySchema>;
