import mongoose from 'mongoose';
import { TENANT_STATUS, TENANT_TYPE } from './tenant.constants';

const tenantSchema = new mongoose.Schema(
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
            default: '',
        },
        type: {
            type: String,
            enum: [TENANT_TYPE.PLATFORM, TENANT_TYPE.CUSTOMER],
            default: TENANT_TYPE.CUSTOMER,
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
            default: null,
            // required: true
        },
        // optional — the (platform) sales person assigned to this tenant account. Updatable;
        // null when unassigned.
        salesPerson: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
            default: null,
        },
        status: {
            type: String,
            enum: [TENANT_STATUS.ACTIVE, TENANT_STATUS.INACTIVE],
            default: TENANT_STATUS.ACTIVE,
        },
    },
    {
        timestamps: true,
    },
);

export const TenantModel = mongoose.model('Tenant', tenantSchema);
export type ITenant = mongoose.InferSchemaType<typeof tenantSchema>;
