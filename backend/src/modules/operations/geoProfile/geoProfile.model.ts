// GeoProfile Model
// FieldServiceProfile Model

import mongoose from 'mongoose';
import { GEO_PROFILE_STATUS, GEO_PROFILE_TYPES } from './geoProfile.constants';

const geoProfileSchema = new mongoose.Schema(
    {
        tenant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            required: true,
        },
        role: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
            unique: true,
            required: true,
        },
        type: {
            type: String,
            enum: Object.values(GEO_PROFILE_TYPES),
            required: true,
        },
        status: {
            type: String,
            enum: Object.values(GEO_PROFILE_STATUS),
            default: GEO_PROFILE_STATUS.ACTIVE,
        },
        coordinates: {
            type: [Number],
            index: '2dsphere',
        },
        // coverage radius in METERS (matches $geoNear distance units); 1000 = 1km
        coverageRadius: {
            type: Number,
            default: 1000,
        },
        meta: {
            type: mongoose.Schema.Types.Mixed,

            default: {},
        },
    },
    { timestamps: true },
);

export const geoProfileModel = mongoose.model('GeoProfile', geoProfileSchema);
export type IGeoProfile = mongoose.InferSchemaType<typeof geoProfileSchema>;
