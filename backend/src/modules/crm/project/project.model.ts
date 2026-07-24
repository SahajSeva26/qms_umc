import mongoose from 'mongoose';
import {
    CLIENT_REPORT_CANDANCE_TYPES,
    CLIENT_REPORT_POINTERS,
    PAYMENT_TERMS,
    PROJECT_EXECUTION_MODES,
    PROJECT_GO_LIVE_SCOPE,
    PROJECT_STATUS,
    PROJECT_TEST_TYPES,
    PROJECT_THERAPY_TYPES,
    PROJECT_TYPES,
} from './project.constants';
import { ALLOWED_ROLETYPE_CODES } from '../../access-management/role-type/roleType.constants';

// exection mode schema
const executionModeSchema = new mongoose.Schema(
    {
        mode: {
            type: String,
            enum: Object.values(PROJECT_EXECUTION_MODES),
            required: [true, 'Execution mode is required'],
        },
        // po based
        poNumber: {
            type: String,
            default: null,
        },
        poDate: {
            type: Date,
            default: null,
        },
        poExpiry: {
            type: Date,
            default: null,
        },

        // agreement based
        agreementNumber: {
            type: String,
            default: null,
        },
        agreementStartDate: {
            type: Date,
            default: null,
        },
        agreementEndDate: {
            type: Date,
            default: null,
        },
        duration: {
            type: Number,
            default: null,
        },
        agreementDocument: {
            type: String,
            default: null,
        },

        // mail confirmation based
        emailReference: String,
        emailDocument: {
            type: String,
            default: null,
        },
    },
    {
        _id: false,
    },
);

const stageHistorySchema = new mongoose.Schema(
    {
        from: {
            type: String,
            enum: Object.values(PROJECT_STATUS),
            required: [true, 'From status is required'],
        },
        to: {
            type: String,
            enum: Object.values(PROJECT_STATUS),
            required: [true, 'To status is required'],
        },
        // frozen snapshot of the actor at the moment of the transition — immutable audit trail.
        // roleId/userId stay linkable; name/email never change even if the user/role later does.
        actor: {
            roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
            name: { type: String },
            email: { type: String },
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
// Project Model
const projectSchema = new mongoose.Schema(
    {
        // 1: BASICS
        name: {
            type: String,
            required: [true, 'Project name is required'],
        },
        code: {
            type: String,
            required: true,
            trim: true,
            unique: true,
        },
        tenant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            required: [true, 'Tenant is required'],
            index: true,
        },
        division: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Division',
            required: [true, 'Division is required'],
            index: true,
        },
        therapy: {
            type: String,
            enum: Object.values(PROJECT_THERAPY_TYPES),
            required: [true, 'Therapy is required'],
        },

        type: [
            {
                type: String,
                enum: Object.values(PROJECT_TYPES),
                required: [true, 'Project type is required'],
            },
        ],
        tests: [
            {
                type: String,
                enum: Object.values(PROJECT_TEST_TYPES),
            },
        ],
        lead: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Lead',
            required: [true, 'Lead is required'],
            index: true,
        },

        // 2: EXECUTION
        executionMode: executionModeSchema,

        // 3: FINANCIALS
        campCost: {
            type: Number,
            default: 0,
            
        },
        totalCamps: {
            type: Number,
            default: 0,
        },
        gst: {
            type: Number,
            min: 0,
            max: 100,
        },
        valueBeforeGST: {
            type: Number,
            default: 0,
        },
        additionalCost: {
            type: Number,
            default: 0,
        },

        // 4: Operations
        campTimeSlots: [
            {
                start: {
                    type: String,
                    required: [true, 'Start time is required'],
                },
                end: {
                    type: String,
                    required: [true, 'End time is required'],
                },
            },
        ],
        freeCancelHours: {
            type: Number,
            default: 0,
        },
        cancellationAllowed: {
            type: Number,
            min: 0,
            max: 100,
            default: 0,
        },
        campCostDeductionOnChargableCancel: {
            type: Number,
            min: 0,
            max: 100,
        },
        goLiveScope: {
            code: {
                type: String,
                enum: Object.values(PROJECT_GO_LIVE_SCOPE),
            },
            values: [
                {
                    type: String,
                    lowercase: true,
                },
            ],
        },
        whoCanBookCamp: [
            {
                type: String,
                enum: Object.values(ALLOWED_ROLETYPE_CODES.CUSTOMER),
            },
        ],

        // 5: TEAM
        salesRep: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
            required: [true, 'Sales rep is required'],
        },
        projectCoordinator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
            required: [true, 'Project coordinator is required'],
        },
        marketingContact: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
            required: [true, 'Marketing contact is required'],
        },
        paymentTerms: {
            type: String,
            enum: Object.values(PAYMENT_TERMS),
            required: [true, 'Payment terms are required'],
        },

        // 6: REPORTS & REVIEW
        status: {
            type: String,
            enum: Object.values(PROJECT_STATUS),
            default: PROJECT_STATUS.NEW,
        },
        stageHistory: [stageHistorySchema],

        daysToBookBefore: {
            type: Number,
            default: 0,
        },
        effectiveEarliestSlot: {
            type: Date,
        },
        dietChart: [
            {
                name: {
                    type: String,
                    required: [true, 'Diet chart name is required'],
                },
                url: {
                    type: String,
                    required: [true, 'Diet chart URL is required'],
                },
            },
        ],

        poRenewalReminder: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },
        clientReportCandance: {
            type: String,
            enum: Object.values(CLIENT_REPORT_CANDANCE_TYPES),
        },
        availablePointers: {
            type: [String],
            enum: Object.values(CLIENT_REPORT_POINTERS),
        },
        tats: {
            type: String,
            default: '',
        },

        sops: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: true,
    },
);

export const Project = mongoose.model('Project', projectSchema);
export type IProject = mongoose.InferSchemaType<typeof projectSchema>;
