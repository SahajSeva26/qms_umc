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

            // normalized to null — model has no default, so an unassigned camp's field is `undefined` otherwise
            fo: camp.fo ?? null,
            dietitian: camp.dietitian ?? null,
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
            meta: camp.meta ?? null,

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
    toSearchResponse: (data: { count: number; items: any[]; stats?: Record<string, { patients: number; patientsCompleted: number }> | undefined; summary?: any }, ctx: RequestContext) => {
        const result: any = {
            count: data?.count || 0,
            items: [] as any[],
        };
        // opt-in top-level summary (only present on "my camps") — total + status/type counts
        if (data?.summary) {
            result.summary = data.summary;
        }
        const stats = data?.stats;
        for (const camp of data?.items || []) {
            // independent from toResponse on purpose — search rows can be trimmed later without affecting GET /:id
            const item: any = {
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

                // field-force assignment — see toResponse's identical note on the fo/dietitian default gap.
                fo: camp.fo ?? null,
                dietitian: camp.dietitian ?? null,
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
                meta: camp.meta ?? null,

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
            // opt-in patient counts (only present when the search was called with report=true)
            if (stats) {
                item.stats = stats[camp._id?.toString()] || { patients: 0, patientsCompleted: 0 };
            }
            result.items.push(item);
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
