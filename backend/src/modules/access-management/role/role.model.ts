import mongoose from 'mongoose';
import { ROLE_STATUSES } from './role.constants';

const roleSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, 'code is required'],
        unique: true,
    },
    name: {
        type: String,
        required: [true, 'name is required'],
    },
    description: {
        type: String,
        default: '',
    },
    //only temp or wildcards permissions
    permissions: [
        {
            type: String,
        },
    ],
    status: {
        type: String,
        enum: [ROLE_STATUSES.ACTIVE, ROLE_STATUSES.INACTIVE],
        default: ROLE_STATUSES.ACTIVE,
    },
    type: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RoleType',
        required: [true, 'role-type is required'],
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'user is required'],
    },
    tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: [true, 'tenant is required'],
    },
});

export const RoleModel = mongoose.model('Role', roleSchema);
export type RoleDocument = mongoose.InferSchemaType<typeof roleSchema>;
