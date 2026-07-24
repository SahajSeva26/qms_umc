// Counter Model
import mongoose from 'mongoose';
import { COUNTER_RESET_POLICIES, COUNTER_STATUSES } from './counter.constants';

const counterSchema = new mongoose.Schema(
    {
        entity: {
            type: String,
            required: [true, 'Entity is required'],
            unique: true,
            lowercase: true,
        },
        prefix: {
            type: String,
            required: [true, 'Prefix is required'],
            lowercase: true,
            trim: true,
        },
        suffix: {
            type: String,
            default: '',
            lowercase: true,
            trim: true,
        },
        separator: {
            type: String,
            default: '-',
        },
        padding: {
            type: Number,
            default: 6,
            min: 1,
        },
        format: {
            type: String,
            default: '{{prefix}}{{separator}}{{number}}',
        },

        currentValue: {
            type: Number,
            default: 0,
            min: 0,
        },
        // resetPolicy: {
        //     type: String,
        //     enum: Object.values(COUNTER_RESET_POLICIES),
        //     default: COUNTER_RESET_POLICIES.NEVER,
        // },
        status: {
            type: String,
            enum: Object.values(COUNTER_STATUSES),
            default: COUNTER_STATUSES.ACTIVE,
        },
        description: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: true,
    },
);

export const CounterModel = mongoose.model('Counter', counterSchema);
export type ICounter = mongoose.InferSchemaType<typeof counterSchema>;
