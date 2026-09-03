// Screening Model
import mongoose from 'mongoose';
import { SCREENING_STATUS } from './screening.constants';

const consentSchema = new mongoose.Schema(
    {
        otp: {
            type: String,
            required: true,
        },
        signature: String,
        verified: {
            //only verify after otp is entered
            //make separate route for this verification
            type: Boolean,
            default: false,
        },
    },
    {
        _id: false,
    },
);

// append-only stage journal — each entry snapshots the actor at the moment of the transition.
// The initial "created" entry has no `from`; every later moveStage entry carries both from + to.
// createdBy / performedBy are read off this journal (first entry's actor = creator, the
// completed-transition actor = who performed the screening) rather than separate fields.
const stageHistorySchema = new mongoose.Schema(
    {
        from: {
            type: String,
            enum: Object.values(SCREENING_STATUS),
        },
        to: {
            type: String,
            enum: Object.values(SCREENING_STATUS),
            required: [true, 'To status is required'],
        },
        // frozen snapshot of the actor — roleId stays linkable; name/email never change afterwards
        actor: {
            roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
            name: { type: String },
            email: { type: String },
        },
        reason: {
            type: String,
        },
    },
    {
        timestamps: true,
    },
);

const ScreeningSchema = new mongoose.Schema(
    {
        tenant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            required: true,
        },
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Patient',
            required: true,
        },
        camp: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Camp',
            required: true,
        },
        // the field officer who performs this screening — pinned at create from the camp's assigned
        // FO (`camp.fo`). Required: a screening only starts on a `live` camp, and a camp cannot go
        // live without an FO, so an assigned FO is always present at create.
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
            required: true,
        },
        consent: {
            type: consentSchema,
            required: true,
        },
        symptoms: {
            type: [String],
            trim: true,
            default: [],
        },
        referral: {
            type: Boolean,
            default: false,
        },
        // cached current stage — the source of truth for transitions is stageHistory below
        status: {
            type: String,
            enum: Object.values(SCREENING_STATUS),
            default: SCREENING_STATUS.PENDING,
        },
        stageHistory: {
            type: [stageHistorySchema],
            default: [],
        },
        // Add other screening fields as needed
    },
    {
        timestamps: true,
    },
);

ScreeningSchema.index({ tenant: 1, patient: 1, camp: 1 }, { unique: true });

export const ScreeningModel = mongoose.model('Screening', ScreeningSchema);
export type ScreeningDocument = mongoose.InferSchemaType<typeof ScreeningSchema>;
