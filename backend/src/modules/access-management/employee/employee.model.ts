// Employee Model
import mongoose from 'mongoose';
import { EMPLOYEE_TYPES, EMPLOYEE_STATUS, EMPLOYEE_GENDER } from './employee.constants';

const employeeSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    type: { type: String, required: true, enum: Object.values(EMPLOYEE_TYPES) },
    doj: { type: Date, required: true },
    dol: { type: Date },
    reason: { type: String },
    meta: { type: Object },

    profile: {
        firstName: String,
        lastName: String,
        profilePicture: {
            url: String,
            thumbnail: String,
        },
        dob: {
            type: Date,
            default: null,
        },
        fatherName: String,
        bloodGroup: String,
        gender: {
            type: String,
            enum: Object.values(EMPLOYEE_GENDER),
            default: EMPLOYEE_GENDER.MALE,
        },
    },

    supervisor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'employee',
    },
    status: {
        type: String,
        enum: Object.values(EMPLOYEE_STATUS),
        default: EMPLOYEE_STATUS.ACTIVE,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: [true, 'user required'],
    },
});

export const EmployeeModel = mongoose.model('Employee', employeeSchema);
export type IEmployee = mongoose.InferSchemaType<typeof employeeSchema>;
