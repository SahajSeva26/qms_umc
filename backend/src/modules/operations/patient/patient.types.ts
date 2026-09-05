// Patient Types

// ========================================================================================
// PATIENT REPORT — RAW AGGREGATION SHAPES ($facet branch outputs)
// ========================================================================================

export interface IPatientReportCountOnly {
    count: number;
}

export interface IPatientReportCountBucket {
    _id: string | null;
    count: number;
}

export interface IPatientReportRaw {
    total: IPatientReportCountOnly[];
    statusCounts: IPatientReportCountBucket[];
    genderCounts: IPatientReportCountBucket[];
}

export interface IPatientReportServiceResult extends IPatientReportRaw {
    generatedAt: Date;
}

// ========================================================================================
// PATIENT REPORT — RESPONSE CONTRACT
// ========================================================================================

export interface IPatientReportSummary {
    totalPatients: number;
    activePatients: number;
    inactivePatients: number;
}


export interface IPatientReportResponse {
    meta: {
        generatedAt: string;
    };
    summary: IPatientReportSummary;
    byGender: { gender: string; count: number }[];
    byStatus: { status: string; count: number }[];
}
