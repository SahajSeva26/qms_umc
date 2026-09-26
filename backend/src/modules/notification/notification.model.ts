import mongoose from 'mongoose';
import { NOTIFICATION_TYPES, NOTIFICATION_CHANNELS, NOTIFICATION_STATUS } from './notification.constants';

const notificationEntitySchema = new mongoose.Schema(
    {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },

        type: {
            type: String,
            required: true,
        },

        event: {
            type: String,
            required: true,
        },
    },
    { _id: false },
);

// Notification Model
const notificationSchema = new mongoose.Schema(
    {
        tenant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            index: true,
        },
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        entity: {
            type: notificationEntitySchema,
        },

        type: {
            type: String,
            enum: Object.values(NOTIFICATION_TYPES),
            required: true,
            index: true,
        },
        channel: {
            type: String,
            enum: Object.values(NOTIFICATION_CHANNELS),
            required: true,
            index: true,
        },

        subject: {
            type: String,
        },

        body: {
            type: String,
        },

        status: {
            type: String,
            enum: Object.values(NOTIFICATION_STATUS),
            default: NOTIFICATION_STATUS.PENDING,
            required: true,
            index: true,
        },

        attempts: {
            type: Number,
            default: 0,
        },
        error: {
            type: String,
        },

        sentAt: {
            type: Date,
        },

        read: {
            type: Boolean,
            default: false,
        },
        readAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    },
);

export const NotificationModel = mongoose.model('Notification', notificationSchema);
export type INotification = mongoose.InferSchemaType<typeof notificationSchema>;
