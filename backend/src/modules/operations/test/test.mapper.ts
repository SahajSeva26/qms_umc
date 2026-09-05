// Test Mapper
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { ITestReportCountOnly, ITestReportResponse, ITestReportServiceResult } from './test.types';

// ========================================================================================
// REPORT HELPERS
// ========================================================================================

const countOf = (branch?: ITestReportCountOnly[]): number => branch?.[0]?.count || 0;

// resolve a possibly-populated ref to a plain response shape
const mapRef = (ref: any, extra: (r: any) => object = () => ({})) => {
    if (!ref) {
        return null;
    }
    if (ref._id) {
        return { id: ref._id.toString(), ...extra(ref) };
    }
    return { id: ref.toString() };
};

const mapResult = (result: any) => {
    if (!result) {
        return null;
    }
    return {
        key: result.key,
        value: result.value,
        unit: result.unit,
        interpretation: result.interpretation,
    };
};

export const TestMapper = {
    toResponse: (test: any, ctx: RequestContext) => {
        return {
            id: test._id?.toString(),

            tenant: mapRef(test.tenant, (t) => ({ name: t.name, code: t.code })),
            screening: mapRef(test.screening, (s) => ({ status: s.status })),
            type: mapRef(test.type, (t) => ({ code: t.code, name: t.name, therapy: t.therapy })),

            result: mapResult(test.result),
            performedBy: mapRef(test.performedBy, (r) => ({ name: r.name, code: r.code })),

            createdAt: test.createdAt,
            updatedAt: test.updatedAt,
        };
    },
    toSearchResponse: (data: { count: number; items: any[] }, ctx: RequestContext) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const test of data?.items || []) {
            result.items.push(TestMapper.toResponse(test, ctx));
        }
        return result;
    },

    // Report response shaping. Aggregate counts only — no clinical field (result key/value/unit/
    // interpretation) and no identifier (test, screening, patient, performedBy, tenant, TestMaster
    // id) is read or exposed.
    toReportResponse: (report: ITestReportServiceResult): ITestReportResponse => {
        return {
            meta: {
                generatedAt: report.generatedAt.toISOString(),
            },

            summary: {
                totalTests: countOf(report?.total),
            },

            byTestType: (report?.typeCounts || []).map((bucket) => ({
                code: bucket.code ?? null,
                name: bucket.name ?? null,
                count: bucket.count,
            })),
        };
    },
};
