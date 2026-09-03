import mongoose from 'mongoose';
import { TENANT_STATUS, TENANT_TYPE } from './tenant.constants';

const addressSchema = new mongoose.Schema(
    {
        addressLine1: {
            type: String,
            required: true,
            trim: true,
        },
        addressLine2: {
            type: String,
            trim: true,
        },
        locality: {
            type: String,
            trim: true,
        },
        city: {
            type: String,
            required: true,
            trim: true,
        },
        state: {
            type: String,
            required: true,
            trim: true,
        },
        country: {
            type: String,
            required: true,
            default: 'India',
            trim: true,
        },
        pincode: {
            type: String,
            required: true,
            trim: true,
        },
        googlePlaceId: {
            type: String,
            trim: true,
        },
        // GeoJSON-style point [longitude, latitude]
        coordinates: {
            type: [Number],
            index: '2dsphere',
        },
    },
    { _id: false },
);

const tenantSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            default: '',
        },
        type: {
            type: String,
            enum: [TENANT_TYPE.PLATFORM, TENANT_TYPE.CUSTOMER],
            default: TENANT_TYPE.CUSTOMER,
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
            default: null,
            // required: true
        },
        // optional — the (platform) sales person assigned to this tenant account. Updatable;
        // null when unassigned.
        salesPerson: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
            default: null,
        },
        status: {
            type: String,
            enum: [TENANT_STATUS.ACTIVE, TENANT_STATUS.INACTIVE],
            default: TENANT_STATUS.ACTIVE,
        },
        // optional — the tenant's registered/office address. Supply on create or update.
        address: {
            type: addressSchema,
        },
    },
    {
        timestamps: true,
    },
);

export const TenantModel = mongoose.model('Tenant', tenantSchema);
export type ITenant = mongoose.InferSchemaType<typeof tenantSchema>;
