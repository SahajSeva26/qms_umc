import mongoose from 'mongoose';
import { LEAD_STATUSES } from './lead.constants';

// Lead Model

const leadSchema = new mongoose.Schema({
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
        required: true,
    },
    problemStatement: {
        type: String,
        required: true,
    },
    numberOfMRS: {
        type: Number,
        required: true,
    },
    currentlyDoing: [
        {
            type: String,
        },
    ],

    notes: {
        type: String,
    },
    type: {
        type: String,
        enum: ['new', 'existing'],
        default: 'new',
    },
    offers: [
        {
            code: String,
            sub_offer: String,
            reason: String,
        },
    ],

    estimatedValue: {
        type: Number,
        default: 0,
        required: true,
    },
    followUpDate: {
        type: Date,
    },
    confidence: {
        type: Number,
        min: 0,
        max: 100,
    },
    
    salesPerson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
    },
    status: {
        type: String,
        enum: Object.values(LEAD_STATUSES),
        default: LEAD_STATUSES.NEW,
    },
});

export const LeadModel = mongoose.model('Lead', leadSchema);
export type ILead = mongoose.InferSchemaType<typeof leadSchema>;
