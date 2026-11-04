// Weekly-plan Mapper

import { RequestContext } from '../../../shared/utils/contextBuilder';

// shape one embedded plan (visit) for the response
const toPlan = (plan: any) => ({
    id: plan._id?.toString(),
    tenant: plan.tenant,
    division: plan.division,
    contactPerson: plan.contactPerson,
    lead: plan.lead,
    invoice: plan.invoice,
    parent: plan.parent,
    agenda: {
        public: plan.agenda?.public,
        private: plan.agenda?.private,
    },
    date: plan.date,
});

const toStageEntry = (entry: any) => ({
    from: entry.from,
    to: entry.to,
    reason: entry.reason,
    actor: entry.actor,
    createdAt: entry.createdAt,
});

export const WeeklyPlanMapper = {
    toResponse: (weeklyPlan: any, ctx: RequestContext) => {
        const result: any = {
            id: weeklyPlan._id?.toString(),
            startDate: weeklyPlan.startDate,
            endDate: weeklyPlan.endDate,
            salesPerson: weeklyPlan.salesPerson,
            status: weeklyPlan.status,
            plans: (weeklyPlan.plans || []).map(toPlan),
            stageHistory: (weeklyPlan.stageHistory || []).map(toStageEntry),
            createdAt: weeklyPlan.createdAt,
            updatedAt: weeklyPlan.updatedAt,
        };
        return result;
    },
    // NOTE: independent from toResponse on purpose — mirrors it field-for-field for now so search rows
    // can be trimmed later without affecting GET /:id.
    toSearchResponse: (data: { count: number; items: any[] }, ctx: RequestContext) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const weeklyPlan of data?.items || []) {
            result.items.push({
                id: weeklyPlan._id?.toString(),
                startDate: weeklyPlan.startDate,
                endDate: weeklyPlan.endDate,
                salesPerson: weeklyPlan.salesPerson,
                    status: weeklyPlan.status,
                plans: (weeklyPlan.plans || []).map(toPlan),
                stageHistory: (weeklyPlan.stageHistory || []).map(toStageEntry),
                createdAt: weeklyPlan.createdAt,
                updatedAt: weeklyPlan.updatedAt,
            });
        }
        return result;
    },
};
