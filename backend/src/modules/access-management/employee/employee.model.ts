// Employee Model
import mongoose from 'mongoose';
import { EMPLOYEE_TYPES, EMPLOYEE_STATUS, EMPLOYEE_GENDER } from './employee.constants';

const employeeSchema = new mongoose.Schema(
    {
        // owning tenant — the registry is tenant-scoped (see employee.service ctx.where())
        tenant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            required: [true, 'tenant is required'],
        },
        email: { type: String, required: true, lowercase: true, trim: true },
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
            ref: 'Employee',
        },
        status: {
            type: String,
            enum: Object.values(EMPLOYEE_STATUS),
            default: EMPLOYEE_STATUS.ACTIVE,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'user required'],
        },
    },
    { timestamps: true },
);

// email + linked user are each unique within a tenant
employeeSchema.index({ tenant: 1, email: 1 }, { unique: true });
employeeSchema.index({ tenant: 1, user: 1 }, { unique: true });

export const EmployeeModel = mongoose.model('Employee', employeeSchema);
export type IEmployee = mongoose.InferSchemaType<typeof employeeSchema>;
