import mongoose from 'mongoose';
import { PERMISSION_GROUP_STATUSES } from './permissionGroup.constants';

const permissionGroupSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: Object.values(PERMISSION_GROUP_STATUSES),
            default: PERMISSION_GROUP_STATUSES.ACTIVE,
        },
        permissions: [
            {
                code: { type: String },
                name: String,
                description: String,
            },
        ],
        tenant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            required: true,
        },
    },
    {
        timestamps: true,
    },
);

export const PermissionGroupModel = mongoose.model('PermissionGroup', permissionGroupSchema);
export type IPermissionGroup = mongoose.InferSchemaType<typeof permissionGroupSchema>;
