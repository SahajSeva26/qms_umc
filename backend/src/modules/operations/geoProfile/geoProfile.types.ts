// GeoProfile Types
import { GEO_PROFILE_REPORT_EXCEPTIONS } from './geoProfile.constants';

// ========================================================================================
// GEO PROFILE REPORT — RAW AGGREGATION SHAPES ($facet branch outputs)
// ========================================================================================

export interface IGeoProfileReportCountOnly {
    count: number;
}

export interface IGeoProfileReportCountBucket {
    _id: string | null;
    count: number;
}

export interface IGeoProfileReportRaw {
    total: IGeoProfileReportCountOnly[];
    statusCounts: IGeoProfileReportCountBucket[];
    typeCounts: IGeoProfileReportCountBucket[];
    activeWithoutCoordinates: IGeoProfileReportCountOnly[];
    coverageRadiusAboveCap: IGeoProfileReportCountOnly[];
}

export interface IGeoProfileReportServiceResult extends IGeoProfileReportRaw {
    generatedAt: Date;
}

// ========================================================================================
// GEO PROFILE REPORT — RESPONSE CONTRACT
// ========================================================================================

// derived from the constants so a new exception cannot drift out of sync with its type
export type IGeoProfileReportExceptionCode = (typeof GEO_PROFILE_REPORT_EXCEPTIONS)[number]['code'];
export type IGeoProfileReportExceptionSeverity = (typeof GEO_PROFILE_REPORT_EXCEPTIONS)[number]['severity'];

export interface IGeoProfileReportException {
    code: IGeoProfileReportExceptionCode;
    severity: IGeoProfileReportExceptionSeverity;
    count: number;
    label: string;
}

export interface IGeoProfileReportSummary {
    totalProfiles: number;
    activeProfiles: number;
    inactiveProfiles: number;
}

export interface IGeoProfileReportResponse {
    meta: {
        generatedAt: string;
    };
    summary: IGeoProfileReportSummary;
    byType: { type: string; count: number }[];
    byStatus: { status: string; count: number }[];
    exceptions: IGeoProfileReportException[];
}
