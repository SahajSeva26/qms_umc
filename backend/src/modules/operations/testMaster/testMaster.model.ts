// TestMaster Model
import { TEST_MASTER_STATUS, TEST_MASTER_CONFIG_INPUT_TYPE } from './testMaster.constants';
import { PROJECT_THERAPY_TYPES } from '../../crm/project/project.constants';
import { CAMP_TYPES } from '../camp/camp.constants';
import mongoose from 'mongoose';

const testMasterConfigSchema = new mongoose.Schema(
    {
        inputs: [
            {
                label: {
                    type: String,
                    required: true,
                    trim: true,
                },

                type: {
                    type: String,
                    enum: Object.values(TEST_MASTER_CONFIG_INPUT_TYPE),
                    required: true,
                },

                unit: {
                    type: String,
                    trim: true,
                },

                options: [
                    {
                        label: {
                            type: String,
                            required: true,
                        },
                        value: {
                            type: String,
                            required: true,
                        },
                    },
                ],
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
        // the camp type this test belongs to (screening / diet / lab) — immutable after create
        campType: {
            type: String,
            enum: Object.values(CAMP_TYPES),
            required: true,
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
