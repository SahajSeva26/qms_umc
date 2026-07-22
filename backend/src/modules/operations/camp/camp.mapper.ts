// Camp Mapper
import { RequestContext } from '../../../shared/utils/contextBuilder';

export const CampMapper = {
    toResponse: (camp: any, ctx: RequestContext) => {
        const result: any = {
            id: camp._id?.toString(),

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
            timeSlot: camp.timeSlot ? { start: camp.timeSlot.start, end: camp.timeSlot.end } : null,
            city: camp.city,
            state: camp.state,

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
                createdBy: entry.createdBy,
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
};
