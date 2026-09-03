// Patient Model
import mongoose from 'mongoose';
import { PATIENT_GENDERS, PATIENT_STATUS } from './patient.constants';

const addressSchema = new mongoose.Schema(
    {
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
        pincode: {
            type: String,
            required: true,
            trim: true,
        },
        line1: {
            type: String,
            required: true,
            trim: true,
        },
        line2: {
            type: String,
            trim: true,
        },
    },
    { _id: false },
);

const patientSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            lowercase: true,
            trim: true,
            required: true,
            unique: true,
        },

        // Personal Information
        firstName: {
            type: String,
            trim: true,
            required: true,
        },
        middleName: {
            type: String,
            trim: true,
        },
        lastName: {
            type: String,
            trim: true,
            // required: true,
        },
        dateOfBirth: {
            type: Date,
            required: true,
        },
        gender: {
            type: String,
            enum: Object.values(PATIENT_GENDERS),
            required: true,
        },
        mobile: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            lowercase: true,
            trim: true,
            unique: true,
            sparse: true,
        },
        // Address
        address: addressSchema,

        // soft-delete / visibility flag
        status: {
            type: String,
            enum: Object.values(PATIENT_STATUS),
            default: PATIENT_STATUS.ACTIVE,
            required: true,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
            required: true,
        },
    },
    {
        timestamps: true,
    },
);

export const PatientModel = mongoose.model('Patient', patientSchema);
export type PatientType = mongoose.InferSchemaType<typeof patientSchema>;
