// TestMaster Types

// ========================================================================================
// TEST MASTER REPORT — RAW AGGREGATION SHAPES ($facet branch outputs)
// ========================================================================================

export interface ITestMasterReportCountOnly {
    count: number;
}

export interface ITestMasterReportGroupBucket {
    _id: string | null;
    count: number;
}

export interface ITestMasterReportRaw {
    total: ITestMasterReportCountOnly[];
    statusCounts: ITestMasterReportGroupBucket[];
    campTypeCounts: ITestMasterReportGroupBucket[];
    therapyCounts: ITestMasterReportGroupBucket[];
}

export interface ITestMasterReportServiceResult extends ITestMasterReportRaw {
    generatedAt: Date;
}

// ========================================================================================
// TEST MASTER REPORT — RESPONSE CONTRACT
// ========================================================================================

export interface ITestMasterReportSummary {
    totalTestMasters: number;
    activeTestMasters: number;
    inactiveTestMasters: number;
}

export interface ITestMasterReportStatusBucket {
    status: string;
    count: number;
}

export interface ITestMasterReportCampTypeBucket {
    campType: string;
    count: number;
}

export interface ITestMasterReportTherapyBucket {
    therapy: string;
    count: number;
}

export interface ITestMasterReportResponse {
    meta: {
        generatedAt: string;
    };
    summary: ITestMasterReportSummary;
    byStatus: ITestMasterReportStatusBucket[];
    byCampType: ITestMasterReportCampTypeBucket[];
    byTherapy: ITestMasterReportTherapyBucket[];
}
