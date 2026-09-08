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
        // coverage radius in METERS (matches $geoNear distance units); 35000 = 35km default reach.
        // Per-profile so each field worker's real travel envelope can be tuned individually.
        coverageRadius: {
            type: Number,
            default: 35000,
        },
        // registered/base address of the field worker. Spread flat (not nested) so no second
        // 2dsphere index is created — the top-level `coordinates` above doubles as the address
        // geo point and keeps findNearest's $geoNear working (a single geo index per collection).
        // All optional: an address is supplementary; supply on create or update.
        addressLine1: {
            type: String,
            trim: true,
        },
        addressLine2: {
            type: String,
            trim: true,
        },
        locality: {
            type: String,
            trim: true,
        },
        city: {
            type: String,
            trim: true,
        },
        state: {
            type: String,
            trim: true,
        },
        country: {
            type: String,
            default: 'India',
            trim: true,
        },
        pincode: {
            type: String,
            trim: true,
        },
        googlePlaceId: {
            type: String,
            trim: true,
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
