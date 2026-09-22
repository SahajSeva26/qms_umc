// Employee Model
import mongoose from 'mongoose';
import { EMPLOYEE_TYPES, EMPLOYEE_STATUS, EMPLOYEE_GENDER, DA_RULE_TYPES } from './employee.constants';

// dearness/daily allowance rule — a flat amount or a percent of salary. A subschema (not an inline
// nested object) so the reserved key `type` is unambiguously a field, not a SchemaType declaration.
const daRuleSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: Object.values(DA_RULE_TYPES),
            required: true,
        },
        value: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    { _id: false },
);

// full postal address — mirrors the location schema used in operations/camp/camp.model.ts (kept
// self-contained here rather than importing across modules). coordinates are GeoJSON [lng, lat].
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

        // compensation
        salary: { type: Number, min: 0 },
        daRule: { type: daRuleSchema },

        // KYC
        aadharNumber: { type: String, trim: true },
        panNumber: { type: String, trim: true, uppercase: true },

        // payout account
        bankDetails: {
            accountHolderName: { type: String, trim: true },
            accountNumber: { type: String, trim: true },
            ifscCode: { type: String, trim: true, uppercase: true },
            bankName: { type: String, trim: true },
            branch: { type: String, trim: true },
        },

        location: { type: locationSchema },

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
