// Invoice Model

import mongoose, { InferSchemaType } from 'mongoose';
import { INVOICE_STATUS } from './invoice.constants';

const stageHistorySchema = new mongoose.Schema(
    {
        from: {
            type: String,
            enum: Object.values(INVOICE_STATUS),
            required: [true, 'From status is required'],
        },
        to: {
            type: String,
            enum: Object.values(INVOICE_STATUS),
            required: [true, 'To status is required'],
        },
        // frozen snapshot of the actor at the moment of the transition — immutable audit trail.
        // roleId stays linkable; name/email never change even if the user/role later does.
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

const invoiceSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: [true, 'Invoice code is required'],
            unique: true,
            trim: true,
        },

        tenant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            required: [true, 'Tenant is required'],
        },

        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
            required: [true, 'Project is required'],
        },

        issueDate: {
            type: Date,
            required: true,
            default: Date.now,
        },

        dueDate: {
            type: Date,
        },

        subtotal: {
            type: Number,
            required: true,
            min: [0, 'Subtotal cannot be negative'],
            default: 0,
        },

        tax: {
            type: Number,
            min: [0, 'Tax cannot be negative'],
            default: 0,
        },

        discount: {
            type: Number,
            min: [0, 'Discount cannot be negative'],
            default: 0,
        },

        total: {
            type: Number,
            required: true,
            min: [0, 'Total cannot be negative'],
            default: 0,
        },

        status: {
            type: String,
            enum: Object.values(INVOICE_STATUS),
            default: INVOICE_STATUS.DRAFT,
        },

        // whether this invoice has been pushed to Tally (accounting sync). Defaults false;
        // flipped true once the sync succeeds.
        syncToTally: {
            type: Boolean,
            default: false,
        },

        stageHistory: [stageHistorySchema],
    },
    {
        timestamps: true,
    },
);

export const InvoiceModel = mongoose.model('Invoice', invoiceSchema);

export type IInvoice = InferSchemaType<typeof invoiceSchema>;
