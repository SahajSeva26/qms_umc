import mongoose from 'mongoose';
import { DIVISION_STATUS, DIVISION_THERAPY } from './division.constants';

const divisionSchema = new mongoose.Schema(
    {
        tenant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            required: true,
            index: true,
        },
        code:{
            type:String,
            required:true,
        },
        name: {
            type: String,
            required: true,
        },
        therapy: {
            type: String,
            enum: Object.values(DIVISION_THERAPY),
            required: true,
        },
        brandFocus: {
            type: String,
            default: '',
        },
        mrCount: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: [DIVISION_STATUS.ACTIVE, DIVISION_STATUS.INACTIVE],
            default: DIVISION_STATUS.ACTIVE,
        },
    },
    {
        timestamps: true,
    },
);

// code is unique per tenant (not globally) — same code can exist across customers
divisionSchema.index({ tenant: 1, code: 1 }, { unique: true });

export const DivisionModel = mongoose.model('Division', divisionSchema);
export type IDivision = mongoose.InferSchemaType<typeof divisionSchema>;
