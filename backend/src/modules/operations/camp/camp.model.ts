// Camp Model

import mongoose, { InferSchemaType } from 'mongoose';
import { CAMP_TYPES, BILLING_TYPES, CAMP_STATUSES } from './camp.constants';

const stageHistorySchema = new mongoose.Schema(
    {
        from: {
            type: String,
            enum: Object.values(CAMP_STATUSES),
            required: [true, 'From status is required'],
        },
        to: {
            type: String,
            enum: Object.values(CAMP_STATUSES),
            required: [true, 'To status is required'],
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
            required: [true, 'Created by is required'],
        },
        reason: {
            type: String,
            required: [true, 'Reason is required'],
        },
    },
    {
        timestamps: true,
    },
);

const campSchema = new mongoose.Schema(
    {
        doctor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor',
            required: [true, 'Doctor is required'],
        },

        // 2: Project & type
        tenant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            required: [true, 'Tenant is required'],
        },
        division: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Division',
            required: [true, 'Division is required'],
        },
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
        },
        mr: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
        },
        asm: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
        },
        rsm: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
        },
        type: {
            type: String,
            enum: Object.values(CAMP_TYPES),
            default: CAMP_TYPES.SCREENING,
        },
        billingType: {
            type: String,
            enum: Object.values(BILLING_TYPES),
            default: BILLING_TYPES.BILLABLE,
        },
        patientExpectation: {
            type: Number,
            default: 0,
        },

        // 3: slot and fo
        date: {
            type: Date,
            required: [true, 'Date is required'],
        },
        timeSlot: {
            start: {
                type: String,
                required: [true, 'Start time is required'],
            },
            end: {
                type: String,
                required: [true, 'End time is required'],
            },
        },
        city: {
            type: String,
            required: [true, 'City is required'],
        },
        state: {
            type: String,
            required: [true, 'State is required'],
        },
        // GeoJSON-style point [longitude, latitude] — the target the nearest-FO allocation
        // searches around. Supplied at request time; feeds $geoNear via geoProfile.findNearest.
        coordinates: {
            type: [Number],
            index: '2dsphere',
        },
        // fo is NOT set at creation — a camp is born `requested` with no field officer.
        // It is filled by the allocate step (nearest-FO), which in turn gates confirmation.
        fo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
        },

        // 4: devices & cofirm
        devices: [
            {
                type: String,
                default: [],
            },
        ],
        notes: {
            type: String,
            trim: true,
        },
        conscentPath: {
            type: String,
            trim: true,
        },

        //status handling
        status: {
            type: String,
            enum: Object.values(CAMP_STATUSES),
            default: CAMP_STATUSES.REQUESTED,
        },
        stageHistory: [stageHistorySchema],
    },
    { timestamps: true },
);

export const CampModel = mongoose.model('Camp', campSchema);
export type ICamp = InferSchemaType<typeof campSchema>;
