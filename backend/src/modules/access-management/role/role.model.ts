import mongoose from 'mongoose';
import { ROLE_STATUSES } from './role.constants';

const roleSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, 'code is required'],
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
    // Optional org-placement, one level finer than tenant. Only customer field-force roles
    // (MR/HO/ASM/RSM) belong to a division. Left null for QMS/platform staff, tenant-admins,
    // and FO/Dietitian — which correctly means "not division-restricted" for scoping
    // (ctx.divisions stays empty => the actor sees across all divisions of their tenant).
    division: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Division',
    },
});
roleSchema.index({ tenant: 1, code: 1 }, { unique: true });
export const RoleModel = mongoose.model('Role', roleSchema);
export type RoleDocument = mongoose.InferSchemaType<typeof roleSchema>;
