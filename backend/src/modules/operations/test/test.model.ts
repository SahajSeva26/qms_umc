// Test Model
import mongoose from 'mongoose';
import { TEST_INTERPRETATION } from './test.constants';

// a single captured result value for the test. `key`/`unit` snapshot the testMaster input the
// field officer filled in; `interpretation` is an optional clinical band (normal/low/high/...).
const resultSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
        },
        value: {
            type: String,
            required: true,
        },
        unit: {
            type: String,
            required: true,
        },
        interpretation: {
            type: String,
            enum: Object.values(TEST_INTERPRETATION),
        },
    },
    { _id: false },
);

const testSchema = new mongoose.Schema(
    {
        tenant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            required: true,
            index: true,
        },

        screening: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Screening',
            required: true,
            index: true,
        },

        type: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TestMaster',
            required: true,
        },
        result: {
            type: resultSchema,
            required: true,
        },

        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
            required: true,
        },
    },
    {
        timestamps: true,
    },
);

// one result per catalog test per screening
testSchema.index({ screening: 1, type: 1 }, { unique: true });

export const TestModel = mongoose.model('Test', testSchema);
export type TestDocument = mongoose.InferSchemaType<typeof testSchema>;
