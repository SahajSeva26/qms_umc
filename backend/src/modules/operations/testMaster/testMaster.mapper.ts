// TestMaster Mapper
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { TEST_MASTER_PERMISSIONS } from './testMaster.constants';
import { TEST_MASTER_STATUS } from './testMaster.constants';
import { CAMP_TYPES } from '../camp/camp.constants';
import { PROJECT_THERAPY_TYPES } from '../../crm/project/project.constants';
import {
    ITestMasterReportCountOnly,
    ITestMasterReportGroupBucket,
    ITestMasterReportResponse,
    ITestMasterReportServiceResult,
} from './testMaster.types';

// ========================================================================================
// REPORT HELPERS
// ========================================================================================

const countOf = (branch?: ITestMasterReportCountOnly[]): number => branch?.[0]?.count || 0;

// Fold a $group branch into a { enumValue: count } lookup so each zero-filled bucket below can
// read its own count. A null/absent _id is skipped rather than bucketed: status, campType and
// therapy are all required + enum-validated, so no null bucket is part of the contract.
const toCountMap = (buckets?: ITestMasterReportGroupBucket[]): Record<string, number> => {
    const map: Record<string, number> = {};
    for (const bucket of buckets || []) {
        if (bucket?._id !== null && bucket?._id !== undefined) {
            map[bucket._id] = bucket.count;
        }
    }
    return map;
};

const mapConsumptionLine = (line: any) => ({
    item: line?.item?._id ? line.item._id.toString() : line?.item?.toString(),
    rate: line?.rate,
});

export const TestMasterMapper = {
    toResponse: (test: any, ctx: RequestContext) => {
        const result: any = {
            id: test._id?.toString(),

            // identity
            code: test.code,
            name: test.name,
            description: test.description,
            therapy: test.therapy,
            campType: test.campType,
            duration: test.duration,
            price: test.price,

            config: test.config,
            consumption: (test.consumption || []).map(mapConsumptionLine),

            createdAt: test.createdAt,
            updatedAt: test.updatedAt,
        };
        // status (incl. inactive tests) is only exposed to a manage-level actor
        if (ctx.hasAnyPermissions([TEST_MASTER_PERMISSIONS.MANAGE.code])) {
            result.status = test.status;
        }
        return result;
    },
    toSearchResponse: (data: { count: number; items: any[] }, ctx: RequestContext) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const test of data?.items || []) {
            result.items.push(TestMasterMapper.toResponse(test, ctx));
        }
        return result;
    },
    toReportResponse: (report: ITestMasterReportServiceResult): ITestMasterReportResponse => {
        const statusMap = toCountMap(report?.statusCounts);
        const campTypeMap = toCountMap(report?.campTypeCounts);
        const therapyMap = toCountMap(report?.therapyCounts);

        return {
            meta: {
                generatedAt: report.generatedAt.toISOString(),
            },

            summary: {
                totalTestMasters: countOf(report?.total),
                activeTestMasters: statusMap[TEST_MASTER_STATUS.ACTIVE] || 0,
                inactiveTestMasters: statusMap[TEST_MASTER_STATUS.INACTIVE] || 0,
            },

            byStatus: Object.values(TEST_MASTER_STATUS).map((status) => ({
                status,
                count: statusMap[status] || 0,
            })),

            byCampType: Object.values(CAMP_TYPES).map((campType) => ({
                campType,
                count: campTypeMap[campType] || 0,
            })),

            byTherapy: Object.values(PROJECT_THERAPY_TYPES).map((therapy) => ({
                therapy,
                count: therapyMap[therapy] || 0,
            })),
        };
    },
};
