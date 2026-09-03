import mongoose from 'mongoose';
import { VENDOR_STATUS } from './vendor-master.constants';

// Vendor-master Model
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
        // GeoJSON-style point [longitude, latitude] — optional; when present it can feed
        // $geoNear-style location lookups.
        coordinates: {
            type: [Number], // [longitude, latitude]
            index: '2dsphere',
        },
    },
    { _id: false },
);

// A vendor can have multiple points of contact.
const contactSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        number: {
            type: String,
            trim: true,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
        },
        designation: {
            type: String,
            trim: true,
        },
    },
    { _id: false },
);

const vendorMasterSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },

        contacts: {
            type: [contactSchema],
            default: [],
        },

        address: {
            type: addressSchema,
        },

        status: {
            type: String,
            enum: Object.values(VENDOR_STATUS),
            default: VENDOR_STATUS.ACTIVE,
            required: true,
            trim: true,
        },
    },
    {
        timestamps: true,
    },
);

export const VendorMasterModel = mongoose.model('VendorMaster', vendorMasterSchema);
export type IVendorMaster = mongoose.InferSchemaType<typeof vendorMasterSchema>;
