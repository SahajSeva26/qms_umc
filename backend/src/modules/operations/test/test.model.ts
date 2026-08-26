// Test Model
import { TEST_STATUS } from './test.constants';
import { PROJECT_THERAPY_TYPES } from '../../crm/project/project.constants';
import mongoose from 'mongoose';

const testSchema = new mongoose.Schema(
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
            trim: true,
        },
        // the therapy area this test belongs to
        therapy: {
            type: String,
            enum: Object.values(PROJECT_THERAPY_TYPES),
            required: true,
            trim: true,
        },
        status: {
            type: String,
            default: TEST_STATUS.ACTIVE,
            enum: Object.values(TEST_STATUS),
            required: true,
            trim: true,
        },

        config: {},

        consumption: [
            {
                item: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'InventoryMaster',
                },
                rate: {
                    type: Number,
                    default: 1,
                },
            },
        ],
    },
    { timestamps: true },
);

export const TestModel = mongoose.model('Test', testSchema);
export type ITest = mongoose.InferSchemaType<typeof testSchema>;
