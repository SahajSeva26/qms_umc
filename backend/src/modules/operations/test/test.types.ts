// Test Types

// ========================================================================================
// TEST REPORT — RAW AGGREGATION SHAPES ($facet branch outputs)
// ========================================================================================

export interface ITestReportCountOnly {
    count: number;
}

export interface ITestReportTypeBucket {
    code: string | null;
    name: string | null;
    count: number;
}

export interface ITestReportRaw {
    total: ITestReportCountOnly[];
    typeCounts: ITestReportTypeBucket[];
}

export interface ITestReportServiceResult extends ITestReportRaw {
    generatedAt: Date;
}

// ========================================================================================
// TEST REPORT — RESPONSE CONTRACT
// ========================================================================================

export interface ITestReportSummary {
    totalTests: number;
}

// Aggregate counts only. No clinical data (result key/value/unit/interpretation) and no identifier (test, screening, patient, performedBy, tenant, TestMaster id) is exposed.
export interface ITestReportResponse {
    meta: {
        generatedAt: string;
    };
    summary: ITestReportSummary;
    byTestType: ITestReportTypeBucket[];
}
