import mongoose from 'mongoose';
import { DOCTOR_SPECIALIZATION, DOCTOR_STATUS } from './doctor.constants';

// Full postal address for the doctor — same embedded shape as camp's `location`.
// coordinates are GeoJSON-style [longitude, latitude] (lng first), 2dsphere-indexed.
const locationSchema = new mongoose.Schema(
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
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true,
            index: '2dsphere',
        },
    },
    { _id: false },
);

// Doctor Model
const doctorSchema = new mongoose.Schema({
    // owner / isolation key — which tenant this doctor belongs to
    tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: [true, 'Tenant is required'],
        index: true,
    },
    // the division (within the tenant) this doctor belongs to — required. Doctors are scoped
    // by division: a customer/field-force actor only ever sees doctors in their own division.
    division: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Division',
        required: [true, 'Division is required'],
        index: true,
    },
    pharmaCode: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    specialization: {
        type: String,
        enum: Object.values(DOCTOR_SPECIALIZATION),
        required: true,
    },
    mobile: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
    },
    // full postal address + geo point — embedded, same pattern as camp's `location`
    location: {
        type: locationSchema,
        required: true,
    },
    status: {
        type: String,
        enum: Object.values(DOCTOR_STATUS),
        default: DOCTOR_STATUS.ACTIVE,
    },
},{
    timestamps: true,
});

// Uniqueness is scoped to the tenant, never global — two different tenants may each own a
// doctor with the same pharmaCode / email (each tenant keeps its own copy of a doctor).
doctorSchema.index({ tenant: 1, pharmaCode: 1 }, { unique: true });
doctorSchema.index({ tenant: 1, email: 1 }, { unique: true });

export const DoctorModel = mongoose.model('Doctor', doctorSchema);
export type IDoctor = mongoose.InferSchemaType<typeof doctorSchema>;
