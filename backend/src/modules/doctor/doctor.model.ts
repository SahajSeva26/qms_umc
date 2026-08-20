import mongoose from 'mongoose';
import { DOCTOR_SPECIALIZATION, DOCTOR_STATUS } from './doctor.constants';

// Doctor Model
const doctorSchema = new mongoose.Schema({
    // owner / isolation key — which tenant this doctor belongs to
    tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: [true, 'Tenant is required'],
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
    city: {
        type: String,
        required: [true, 'City is required'],
    },
    state: {
        type: String,
        required: [true, 'State is required'],
    },
    pincode: {
        type: String,
        required: [true, 'Pincode is required'],
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
    },
    googleMapLink: {
        type: String,
        default: '',
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
