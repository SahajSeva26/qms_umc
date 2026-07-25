import mongoose from 'mongoose';
import { CONTACT_STATUS, CONTACT_TYPES } from './contact.constants';

// Contact Model
// A person who belongs to a tenant (pharma client contact, QMS staff record, etc.).
// Exists independently of whether they can log in — `user` is set only if/when they get an account.
const contactSchema = new mongoose.Schema(
    {
        // owner / isolation key — which tenant this contact belongs to
        tenant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            required: [true, 'Tenant is required'],
            index: true,
        },
        name: {
            type: String,
            required: [true, 'Name is required'],
        },
        designation: {
            type: String,
        },
        email: {
            type: String,
        },
        phone: {
            type: String,
        },
        location: {
            type: String,
        },
        type: {
            type: String,
            enum: Object.values(CONTACT_TYPES),
            default: CONTACT_TYPES.CUSTOMER,
        },
        // optional login link — null for the many contacts who never sign in.
        // set this (a one-field update) the day a contact is given an account.
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        status: {
            type: String,
            enum: Object.values(CONTACT_STATUS),
            default: CONTACT_STATUS.ACTIVE,
        },
    },
    {
        timestamps: true,
    },
);

// Uniqueness is scoped to the tenant, never global — two different tenants may each have a
// contact with the same email. Partial filter so the many contacts without an email don't
// collide on a shared null value.
contactSchema.index(
    { tenant: 1, email: 1 },
    { unique: true, partialFilterExpression: { email: { $type: 'string' } } },
);

export const ContactModel = mongoose.model('Contact', contactSchema);
export type IContact = mongoose.InferSchemaType<typeof contactSchema>;
