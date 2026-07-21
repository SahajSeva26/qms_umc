import mongoose from 'mongoose';
import { ROLE_TYPE_STATUSES } from './roleType.constants';

const roleTypeSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
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
        // seed-owned infrastructure role types (system, admin, sales, sales-head) are marked
        // isSystem. Set ONLY by the seed — never accepted by the create/update validators — so its
        // code is reserved: the API cannot create another role type using a system role type's code.
        isSystem: {
            type: Boolean,
            default: false,
        },
        // category: String,
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

roleTypeSchema.index({ tenant: 1, code: 1 }, { unique: true });
export const RoleTypeModel = mongoose.model('RoleType', roleTypeSchema);
export type IRoleType = mongoose.InferSchemaType<typeof roleTypeSchema>;
