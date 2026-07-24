import { RequestContext } from '../../../shared/utils/contextBuilder';

export const ProjectMapper = {
    toResponse: (project: any, ctx: RequestContext) => {
        const result: any = {
            id: project._id?.toString(),
            code: project.code,

            // basics
            tenant: project.tenant,
            division: project.division,
            lead: project.lead,
            name: project.name,
            therapy: project.therapy,
            type: project.type || [],
            tests: project.tests || [],

            // execution
            mode: project.mode || null,

            // financials
            campCost: project.campCost,
            totalCamps: project.totalCamps,
            gst: project.gst,
            valueBeforeGST: project.valueBeforeGST,
            additionalCost: project.additionalCost,

            // operations
            campTimeSlots: (project.campTimeSlots || []).map((slot: any) => ({
                start: slot.start,
                end: slot.end,
            })),
            freeCancelHours: project.freeCancelHours,
            cancellationAllowed: project.cancellationAllowed,
            campCostDeductionOnChargableCancel: project.campCostDeductionOnChargableCancel,
            goLiveScope: project.goLiveScope
                ? { code: project.goLiveScope.code, values: project.goLiveScope.values || [] }
                : null,
            whoCanBookCamp: project.whoCanBookCamp || [],

            // team
            salesRep: project.salesRep,
            projectCoordinator: project.projectCoordinator,
            marketingContact: project.marketingContact,
            paymentTerms: project.paymentTerms,

            // reports & review
            status: project.status,
            stageHistory: (project.stageHistory || []).map((entry: any) => ({
                from: entry.from,
                to: entry.to,
                reason: entry.reason,
                actor: entry.actor,
                createdAt: entry.createdAt,
            })),
            daysToBookBefore: project.daysToBookBefore,
            effectiveEarliestSlot: project.effectiveEarliestSlot,
            dietChart: (project.dietChart || []).map((chart: any) => ({
                name: chart.name,
                url: chart.url,
            })),
            poRenewalReminder: project.poRenewalReminder,
            clientReportCandance: project.clientReportCandance,
            availablePointers: project.availablePointers || [],
            tats: project.tats,
            sops: project.sops,

            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
        };
        return result;
    },
    toSearchResponse: (data: { count: number; items: any[] }, ctx: RequestContext) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const project of data?.items || []) {
            result.items.push(ProjectMapper.toResponse(project, ctx));
        }
        return result;
    },
};
