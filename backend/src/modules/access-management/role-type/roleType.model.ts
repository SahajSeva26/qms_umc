import mongoose from 'mongoose';
import { ROLE_TYPE_STATUSES } from './roleType.constants';

const roleTypeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        default: '',
    },
    permissions: [
        {
            type: String,
        },
    ],

    status: {
        type: String,
        enum: [ROLE_TYPE_STATUSES.ACTIVE, ROLE_TYPE_STATUSES.INACTIVE],
        default: ROLE_TYPE_STATUSES.ACTIVE,
    },
    category: String,
    tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
    },
},{
    timestamps: true,
});

export const RoleTypeModel = mongoose.model('RoleType', roleTypeSchema);
export type IRoleType = mongoose.InferSchemaType<typeof roleTypeSchema>;
