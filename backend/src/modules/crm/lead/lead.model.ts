import mongoose from 'mongoose';
import { LEAD_PROJECT_TYPES, LEAD_STATUSES } from './lead.constants';

// lead status transition
const stageHistorySchema = new mongoose.Schema(
    {
        from: {
            type: String,
            enum: Object.values(LEAD_STATUSES),
            required: [true, 'From status is required'],
        },
        to: {
            type: String,
            enum: Object.values(LEAD_STATUSES),
            required: [true, 'To status is required'],
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
            required: [true, 'Created by is required'],
        },
        reason: {
            type: String,
            required: [true, 'Reason is required'],
        },
    },
    {
        timestamps: true,
    },
);
// Lead Model
const leadSchema = new mongoose.Schema(
    {
        // 1: owner/client reference
        tenant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            required: true,
            index: true,
        },
        company: {},
        division: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Division',
            required: true,
            index: true,
        },
        contactPerson: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
            required: true,
        },

        // 2: therapy
        focusTherapy: [
            {
                type: String,
            },
        ],
        focusTherapyDoctor: [
            {
                type: String,
            },
        ],

        // 3: lead details
        title: {
            type: String,
            required: [true, 'Title is required'],
        },
        problemStatement: {
            type: String,
            required: [true, 'Problem statement is required'],
        },
        numberOfMRS: {
            type: Number,
            required: [true, 'Number of MRS is required'],
        },
        currentlyDoing: [
            {
                type: String,
            },
        ],

        notes: {
            type: String,
        },
        projectType: {
            type: String,
            enum: Object.values(LEAD_PROJECT_TYPES),
            default: LEAD_PROJECT_TYPES.SCREENING,
            required: [true, 'Project types is required'],
        },
        offers: [
            {
                code: String,
                subOffer: String,
                reason: String,
            },
        ],

        estimatedValue: {
            type: Number,
            default: 0,
            required: [true, 'Estimated value is required'],
        },
        followUpDate: {
            type: Date,
        },
        confidence: {
            type: Number,
            min: 0,
            max: 100,
            required: [true, 'Confidence is required'],
        },

        salesPerson: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
            required: [true, 'Sales person is required'],
        },
        status: {
            type: String,
            enum: Object.values(LEAD_STATUSES),
            default: LEAD_STATUSES.NEW,
        },
        stageHistory: [stageHistorySchema],

        meta: {
            type: Object,
            default: {},
        },
    },
    {
        timestamps: true,
    },
);

export const LeadModel = mongoose.model('Lead', leadSchema);
export type ILead = mongoose.InferSchemaType<typeof leadSchema>;
