// Weekly-plan Model
import mongoose from 'mongoose';
import { WEEKLY_PLAN_STATUS } from './weekly-plan.constants';

const planSchema = new mongoose.Schema({
    tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
    },
    division: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Division',
        required: [true, 'Division is required'],
    },
    contactPerson: {
        //from pharma/client
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact',
        required: [true, 'Contact person is required'],
    },

    lead: {
        //only for follow-up appointments
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead',
        // required: [true, 'Lead is required'],
    },
    invoice: {
        // for invoices
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
    },

    agenda: {
        public: {
            type: String,
            default: '',
        },
        private: {
            type: String,
            default: '',
        },
    },
    date: {
        type: Date,
        required: true,
    },
});

// append-only audit journal of status transitions — mirrors the appointment stageHistory pattern.
const stageHistorySchema = new mongoose.Schema(
    {
        from: {
            type: String,
            enum: Object.values(WEEKLY_PLAN_STATUS),
            required: [true, 'From status is required'],
        },
        to: {
            type: String,
            enum: Object.values(WEEKLY_PLAN_STATUS),
            required: [true, 'To status is required'],
        },
        // frozen snapshot of the actor at the moment of the transition — immutable audit trail.
        // roleId stays linkable; name/email never change even if the user/role later does.
        actor: {
            roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
            name: { type: String },
            email: { type: String },
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

const weeklyPlanSchema = new mongoose.Schema(
    {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        salesPerson: {
            //also the owner and who will create this
            //auto pickup who creates it
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
            required: [true, 'Sales person is required'],
        },
        supervisor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
            required: true,
        },
        status: {
            type: String,
            enum: Object.values(WEEKLY_PLAN_STATUS),
            default: WEEKLY_PLAN_STATUS.PENDING,
        },
        plans: {
            type: [planSchema],
            default: [],
            // Mongoose ignores `max` on arrays — enforce the 6-per-week cap with a custom validator.
            validate: {
                validator: (v: unknown[]) => v.length <= 6,
                message: 'A weekly plan can have at most 6 plans',
            },
        },
        stageHistory: [stageHistorySchema],
    },
    {
        timestamps: true,
    },
);

export const WeeklyPlanModel = mongoose.model('WeeklyPlan', weeklyPlanSchema);
export type IWeeklyPlan = mongoose.InferSchemaType<typeof weeklyPlanSchema>;
