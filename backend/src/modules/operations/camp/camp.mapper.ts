// Camp Mapper
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { BILLING_TYPES, CAMP_STATUSES, CAMP_TYPES } from './camp.constants';

export const CampMapper = {
    toResponse: (camp: any, ctx: RequestContext) => {
        const result: any = {
            id: camp._id?.toString(),
            code: camp.code,

            // links (derived from project)
            tenant: camp.tenant,
            division: camp.division,
            project: camp.project,
            doctor: camp.doctor,

            // classification
            type: camp.type,
            billingType: camp.billingType,
            patientExpectation: camp.patientExpectation,

            // field-force assignment
            fo: camp.fo,
            mr: camp.mr,
            asm: camp.asm,
            rsm: camp.rsm,

            // slot & location
            date: camp.date,
            timeSlot: camp.timeSlot || null,
            location: camp.location || null,

            // devices & confirmation
            devices: camp.devices || [],
            notes: camp.notes,
            conscentPath: camp.conscentPath,

            // lifecycle
            status: camp.status,
            stageHistory: (camp.stageHistory || []).map((entry: any) => ({
                from: entry.from,
                to: entry.to,
                reason: entry.reason,
                actor: entry.actor,
                createdAt: entry.createdAt,
            })),

            createdAt: camp.createdAt,
            updatedAt: camp.updatedAt,
        };
        return result;
    },
    toSearchResponse: (data: { count: number; items: any[] }, ctx: RequestContext) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const camp of data?.items || []) {
            result.items.push(CampMapper.toResponse(camp, ctx));
        }
        return result;
    },
    toReportResponse: (report: any) => {
        const statusCounts = new Map<string, number>((report?.statusCounts || []).map((s: any) => [s._id, s.count]));
        const typeCounts = new Map<string, number>((report?.typeCounts || []).map((t: any) => [t._id, t.count]));
        const billingTypeCounts = new Map<string, number>(
            (report?.billingTypeCounts || []).map((b: any) => [b._id, b.count]),
        );

        return {
            summary: {
                totalCamps: report?.totalCamps?.[0]?.count || 0,
            },
            byStatus: Object.values(CAMP_STATUSES).map((status) => ({
                status,
                count: statusCounts.get(status) || 0,
            })),
            byType: Object.values(CAMP_TYPES).map((type) => ({
                type,
                count: typeCounts.get(type) || 0,
            })),
            byBillingType: Object.values(BILLING_TYPES).map((billingType) => ({
                billingType,
                count: billingTypeCounts.get(billingType) || 0,
            })),
        };
    },
};
