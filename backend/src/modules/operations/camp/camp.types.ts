// Camp Types
import mongoose from 'mongoose';
import { CAMP_REPORT_EXCEPTIONS } from './camp.constants';

// ========================================================================================
// CAMP REPORT — WINDOW
// ========================================================================================

// The report window always applies to the camp's SCHEDULED date (`camp.date`), never `createdAt`.
// `basis` is returned to the client so no number can be misread as booking-date based.
export interface ICampReportWindow {
    from: Date;
    to: Date;
    basis: 'date';
}

// ========================================================================================
// CAMP REPORT — RAW AGGREGATION SHAPES ($facet branch outputs)
// ========================================================================================

export interface ICampReportCountOnly {
    count: number;
}

// a $group bucket keyed on an enum/string field; `_id` may be null when the field is absent
export interface ICampReportCountBucket {
    _id: string | null;
    count: number;
}

// one scheduled-month bucket — `_id` is a '%Y-%m' string produced by $dateToString in UTC
export interface ICampReportTrendBucket {
    _id: string;
    scheduled: number;
    closed: number;
    cancelled: number;
}

// one field-officer bucket. `_id` is null for the UNALLOCATED bucket (camps with `fo: null`),
// deliberately preserved rather than dropped. `foDoc` is the projected Role lookup (name/code only).
export interface ICampReportFoBucket {
    _id: mongoose.Types.ObjectId | null;
    total: number;
    upcoming: number;
    closed: number;
    cancelled: number;
    foDoc: { name?: string; code?: string }[];
}

// requested -> confirmed turnaround. The branch returns an empty array when no camp in the window
// was ever confirmed, so every field must be treated as possibly absent.
export interface ICampReportTurnaroundBucket {
    _id: null;
    avg: number | null;
    sampleSize: number;
}

export interface ICampReportRaw {
    // window-scoped branches
    total: ICampReportCountOnly[];
    statusCounts: ICampReportCountBucket[];
    typeCounts: ICampReportCountBucket[];
    billingTypeCounts: ICampReportCountBucket[];
    timeSlotCounts: ICampReportCountBucket[];
    stateCounts: ICampReportCountBucket[];
    byFieldOfficer: ICampReportFoBucket[];
    trend: ICampReportTrendBucket[];
    turnaround: ICampReportTurnaroundBucket[];

    // current-state branches (window-independent)
    liveNow: ICampReportCountOnly[];
    scheduledToday: ICampReportCountOnly[];
    scheduledNext7Days: ICampReportCountOnly[];
    scheduledNext30Days: ICampReportCountOnly[];
    unallocated: ICampReportCountOnly[];
    unallocatedImminent: ICampReportCountOnly[];
    staleLive: ICampReportCountOnly[];
    staleConfirmed: ICampReportCountOnly[];
    noProject: ICampReportCountOnly[];
    noCoordinates: ICampReportCountOnly[];
}

// what the service hands the mapper: raw facet output + the resolved window/timestamp
export interface ICampReportServiceResult extends ICampReportRaw {
    generatedAt: Date;
    window: ICampReportWindow;
}

// ========================================================================================
// CAMP REPORT — RESPONSE CONTRACT
// ========================================================================================

// derived from the constants so a new exception cannot drift out of sync with its type
export type ICampReportExceptionCode = (typeof CAMP_REPORT_EXCEPTIONS)[number]['code'];
export type ICampReportExceptionSeverity = (typeof CAMP_REPORT_EXCEPTIONS)[number]['severity'];

export interface ICampReportException {
    code: ICampReportExceptionCode;
    severity: ICampReportExceptionSeverity;
    count: number;
    label: string;
}

export interface ICampReportSummary {
    // window-scoped
    totalCamps: number;
    closedCamps: number;
    cancelledFree: number;
    cancelledCharged: number;
    cancellationRate: number;

    // current-state (window-independent)
    liveNow: number;
    scheduledToday: number;
    scheduledNext7Days: number;
    scheduledNext30Days: number;
    unallocatedCamps: number;
}

export interface ICampReportTurnaroundStat {
    avg: number | null;
    sampleSize: number;
}

// One row of FO WORKLOAD — camp counts only.
export interface ICampReportFoRow {
    fo: string | null;
    name: string | null;
    code: string | null;
    total: number;
    upcoming: number;
    closed: number;
    cancelled: number;
}

export interface ICampReportTrendRow {
    period: string;
    scheduled: number;
    closed: number;
    cancelled: number;
}

export interface ICampReportResponse {
    meta: {
        generatedAt: string;
        window: { from: string; to: string; basis: 'date' };
    };
    summary: ICampReportSummary;
    byStatus: { status: string; count: number }[];
    byType: { type: string; count: number }[];
    byBillingType: { billingType: string; count: number }[];
    byTimeSlot: { timeSlot: string; count: number }[];
    byState: { state: string | null; count: number }[];
    byFieldOfficer: ICampReportFoRow[];
    trend: ICampReportTrendRow[];
    turnaround: { requestedToConfirmedHours: ICampReportTurnaroundStat };
    exceptions: ICampReportException[];
}
