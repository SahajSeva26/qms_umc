// TestMaster Model
import { TEST_MASTER_STATUS, TEST_MASTER_CONFIG_INPUT_TYPE, TEST_MASTER_CONFIG_OPERATORS } from './testMaster.constants';
import { PROJECT_THERAPY_TYPES } from '../../crm/project/project.constants';
import mongoose from 'mongoose';

const testMasterConfigSchema = new mongoose.Schema(
    {
        input: {
            type: String,
            enum: Object.values(TEST_MASTER_CONFIG_INPUT_TYPE),
            required: true,
            trim: true,
            lowercase: true,
        },
        options: [
            {
                label: {
                    type: String,
                    trim: true,
                },
                value: {
                    type: String,
                    trim: true,
                    lowercase: true,
                },
            },
        ],
        mapper: [
            {
                operator: {
                    type: String,
                    enum: Object.values(TEST_MASTER_CONFIG_OPERATORS),
                    required: true,
                    lowercase: true,
                    trim: true,
                },
                value: {
                    type: mongoose.Schema.Types.Mixed,
                    required: true,
                },
                result: {
                    type: String,
                    required: true,
                    trim: true,
                },
                level: {
                    type: String,
                    required: true,
                    trim: true,
                },
            },
        ],
    },
    { _id: false },
);

const testMasterSchema = new mongoose.Schema(
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
        // time taken to perform the test, in minutes
        duration: {
            type: Number,
            required: true,
        },
        // price of the test
        price: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            default: TEST_MASTER_STATUS.ACTIVE,
            enum: Object.values(TEST_MASTER_STATUS),
            required: true,
            trim: true,
        },

        config: testMasterConfigSchema,

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

export const TestMasterModel = mongoose.model('TestMaster', testMasterSchema);
export type ITestMaster = mongoose.InferSchemaType<typeof testMasterSchema>;
