// InvoiceLineItem Model
// Invoice Line Item Model

import mongoose, { InferSchemaType } from 'mongoose';

const invoiceLineItemSchema = new mongoose.Schema(
    {
        invoice: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Invoice',
            required: [true, 'Invoice is required'],
        },

        camp: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Camp',
            required: [true, 'Camp is required'],
        },

        amount: {
            type: Number,
            required: [true, 'Amount is required'],
            min: [0, 'Amount cannot be negative'],
        },
    },
    {
        timestamps: true,
    },
);

// A camp can only be processed/invoiced once
invoiceLineItemSchema.index({ camp: 1 }, { unique: true });

export const InvoiceLineItemModel = mongoose.model('InvoiceLineItem', invoiceLineItemSchema);

export type IInvoiceLineItem = InferSchemaType<typeof invoiceLineItemSchema>;
