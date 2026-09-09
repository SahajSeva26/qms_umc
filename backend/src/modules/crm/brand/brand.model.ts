// Brand Model
import mongoose from 'mongoose';
import { BRAND_STATUS } from './brand.constants';

const brandSchema = new mongoose.Schema(
    {
        tenant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            required: true,
        },
        division: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Division',
            required: true,
        },
        name: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        description: {
            type: String,
            required: false,
        },
        status: {
            type: String,
            enum: Object.values(BRAND_STATUS),
            default: BRAND_STATUS.ACTIVE,
        },
        molecule: {
            type: String,
        },
        notes: {
            type: String,
            default: '',
        },
        color: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: true,
    },
);

brandSchema.index({ tenant: 1, division: 1 });

export const BrandModel = mongoose.model('Brand', brandSchema);
export type IBrand = mongoose.InferSchemaType<typeof brandSchema>;
