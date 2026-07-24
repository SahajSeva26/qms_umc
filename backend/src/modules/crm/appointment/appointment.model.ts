// Appointment Model

import mongoose from 'mongoose';
import { APPOINTMENT_MODES, APPOINTMENT_STATUSES, APPOINTMENT_TYPES } from './appointment.constants';

const stageHistorySchema = new mongoose.Schema(
    {
        from: {
            type: String,
            enum: Object.values(APPOINTMENT_STATUSES),
            required: [true, 'From status is required'],
        },
        to: {
            type: String,
            enum: Object.values(APPOINTMENT_STATUSES),
            required: [true, 'To status is required'],
        },
        // frozen snapshot of the actor at the moment of the transition — immutable audit trail.
        // roleId/userId stay linkable; name/email never change even if the user/role later does.
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

const appointmentSchema = new mongoose.Schema(
    {
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
        department: {
            type: String,
        },
        meetingNo: {
            type: String,
            required: [true, 'Meeting number is required'],
        },
        type: {
            type: String,
            enum: Object.values(APPOINTMENT_TYPES),
            required: [true, 'Type is required'],
        },
        salesPerson: {
            //also the owner and who will create this
            //auto pickup who creates it
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
            required: [true, 'Sales person is required'],
        },

        contactPerson: {
            //from pharma/client
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
            required: [true, 'Contact person is required'],
        },

        internalMembers: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Role',
            },
        ],
        lead: {
            //only for follow-up appointments
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Lead',
            required: [true, 'Lead is required'],
        },
        // invoice: {
        // // for invoices
        //     type: mongoose.Schema.Types.ObjectId,
        //     ref: 'Invoice',
        // },
        parent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Appointment',
        },
        mode: {
            type: String,
            enum: Object.values(APPOINTMENT_MODES),
            default: APPOINTMENT_MODES.ONLINE,
            required: [true, 'Mode is required'],
        },
        destinationLink: {
            // can be both google meet or map link
            type: String,
            default: '',
        },
        startTime: {
            type: Date,
            required: [true, 'Start time is required'],
        },
        endTime: {
            type: Date,
            required: [true, 'End time is required'],
        },
        agendaPublic: {
            type: String,
            default: '',
        },
        agendaPrivate: {
            type: String,
            default: '',
        },
        status: {
            type: String,
            enum: Object.values(APPOINTMENT_STATUSES),
            default: APPOINTMENT_STATUSES.PLANNED,
        },
        mom: {
            detaills: {
                type: String,
                default: '',
            },
            submittedAt: {
                type: Date,
            },
        },
        nextSteps: {
            type: String,
            default: '',
        },
        // reminders: {
        //     type: Boolean,
        //     default: false,
        // },
        stageHistory: stageHistorySchema,
    },
    {
        timestamps: true,
    },
);

export const AppointmentModel = mongoose.model('Appointment', appointmentSchema);
export type IAppointment = mongoose.InferSchemaType<typeof appointmentSchema>;
