import mongoose, { InferSchemaType } from 'mongoose';

const ratingSchema = new mongoose.Schema(
    {
        camp: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Camp',
            required: true,
        },
        // the rated field worker — the camp's fo (or dietitian later). A Role, matching camp.fo/dietitian.
        worker: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
            required: true,
        },
        // who rates — the MR (camp.mr). A Role.
        ratedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
            required: true,
        },
        tenant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            required: true,
        },
        onTime: {
            type: Number,
            required: true,
            min: 0,
            max: 5,
        },
        attire: {
            type: Number,
            required: true,
            min: 0,
            max: 5,
        },
        communication: {
            type: Number,
            required: true,
            min: 0,
            max: 5,
        },
        // derived by the service (average of onTime/attire/communication) — never accepted from the payload
        overall: {
            type: Number,
            required: true,
            min: 0,
            max: 5,
        },
        ratedAt: {
            type: Date,
            default: Date.now,
            required: true,
        },
    },
    {
        timestamps: true,
    },
);

// one rating per (tenant, camp, worker, rater) — each rater rates a worker once per camp
ratingSchema.index({ tenant: 1, camp: 1, worker: 1, ratedBy: 1 }, { unique: true });

export const RatingModel = mongoose.model('Rating', ratingSchema);
export type IRating = InferSchemaType<typeof ratingSchema>;
