// Screening Types
import { SCREENING_REPORT_EXCEPTIONS } from './screening.constants';

// ========================================================================================
// SCREENING REPORT — RAW AGGREGATION SHAPES ($facet branch outputs)
// ========================================================================================

export interface IScreeningReportCountOnly {
    count: number;
}

export interface IScreeningReportCountBucket {
    _id: string | null;
    count: number;
}

export interface IScreeningReportRaw {
    total: IScreeningReportCountOnly[];
    statusCounts: IScreeningReportCountBucket[];
    awaitingConsent: IScreeningReportCountOnly[];
}

export interface IScreeningReportServiceResult extends IScreeningReportRaw {
    generatedAt: Date;
}

// ========================================================================================
// SCREENING REPORT — RESPONSE CONTRACT
// ========================================================================================

// derived from the constants so a new exception cannot drift out of sync with its type
export type IScreeningReportExceptionCode = (typeof SCREENING_REPORT_EXCEPTIONS)[number]['code'];
export type IScreeningReportExceptionSeverity = (typeof SCREENING_REPORT_EXCEPTIONS)[number]['severity'];

export interface IScreeningReportException {
    code: IScreeningReportExceptionCode;
    severity: IScreeningReportExceptionSeverity;
    count: number;
    label: string;
}

export interface IScreeningReportSummary {
    // every Screening document within the caller's tenant scope
    totalScreenings: number;
    pendingScreenings: number;
    completedScreenings: number;
    cancelledScreenings: number;
}

// Aggregate counts only. No patient, consent, symptom, stage-history or clinical field is exposed.
export interface IScreeningReportResponse {
    meta: {
        generatedAt: string;
    };
    summary: IScreeningReportSummary;
    byStatus: { status: string; count: number }[];
    exceptions: IScreeningReportException[];
}
