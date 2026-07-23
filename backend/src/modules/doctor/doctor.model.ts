import mongoose from 'mongoose';
import { DOCTOR_SPECIALIZATION, DOCTOR_STATUS } from './doctor.constants';

// Doctor Model
const doctorSchema = new mongoose.Schema({
    pharmaCode: {
        type: String,
        required: true,
        unique: true,
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
        unique: true,
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

export const DoctorModel = mongoose.model('Doctor', doctorSchema);
export type IDoctor = mongoose.InferSchemaType<typeof doctorSchema>;
