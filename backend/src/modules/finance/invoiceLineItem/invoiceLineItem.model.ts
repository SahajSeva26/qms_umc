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

// A camp can be re-billed after its previous invoice was cancelled, so a camp may legitimately
// appear on more than one line item over time (the cancelled one + a live one). Uniqueness is
// therefore enforced in the service (assertCampBillable — a camp may sit on at most one
// non-cancelled invoice), NOT by a unique index. These indexes are plain, for lookup speed:
//   - by camp: the "is this camp already billed?" check
//   - by invoice: listing a given invoice's lines
invoiceLineItemSchema.index({ camp: 1 });
invoiceLineItemSchema.index({ invoice: 1 });

export const InvoiceLineItemModel = mongoose.model('InvoiceLineItem', invoiceLineItemSchema);

export type IInvoiceLineItem = InferSchemaType<typeof invoiceLineItemSchema>;
