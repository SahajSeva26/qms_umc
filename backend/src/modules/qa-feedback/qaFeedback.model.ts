import mongoose from 'mongoose';
import { QA_FEEDBACK_STATUS } from './qaFeedback.constants';

const qaFeedbackSchema = new mongoose.Schema(
    {
        // The app route the tester was on, e.g. '/crm' or '/admin/role-types/64f...'
        // — a plain string, not a ref, since this describes a frontend URL, not a
        // database entity.
        pageRoute: {
            type: String,
            required: true,
        },
        // Optional human-readable label for the screen (e.g. document.title at
        // capture time) — purely cosmetic, makes the review list scannable
        // without decoding routes.
        pageTitle: {
            type: String,
            default: '',
        },
        // Pin position as a PERCENTAGE of the live page's viewport at click
        // time (0-100), not raw pixels — resolution-independent, so a pin
        // dropped on a 1440px-wide screen still lands in roughly the right
        // spot referenced when reviewed on a different screen size. No
        // screenshot is captured/stored (deliberately dropped — this is a
        // pure text-comment + rough position report, not a visual one).
        pinXPercent: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        },
        pinYPercent: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        },
        comment: {
            type: String,
            required: true,
        },
        reportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: Object.values(QA_FEEDBACK_STATUS),
            default: QA_FEEDBACK_STATUS.OPEN,
            index: true,
        },
        // Free-text note a reviewer can leave when resolving (e.g. "fixed in
        // commit abc123", "not a bug, works as intended") — optional, shown
        // alongside the resolved state rather than as its own endpoint.
        resolutionNote: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: true,
    },
);

export const QaFeedbackModel = mongoose.model('QaFeedback', qaFeedbackSchema);
export type IQaFeedback = mongoose.InferSchemaType<typeof qaFeedbackSchema>;
