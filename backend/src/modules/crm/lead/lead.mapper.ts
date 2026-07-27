import { RequestContext } from '../../../shared/utils/contextBuilder';

export const LeadMapper = {
    toResponse: (lead: any, ctx: RequestContext) => {
        const result: any = {
            id: lead._id?.toString(),
            code: lead.code,
            tenant: lead.tenant,
            division: lead.division,
            contactPerson: lead.contactPerson,
            focusTherapy: lead.focusTherapy || [],
            focusTherapyDoctor: lead.focusTherapyDoctor || [],
            title: lead.title,
            problemStatement: lead.problemStatement,
            numberOfMRS: lead.numberOfMRS,
            currentlyDoing: lead.currentlyDoing || [],
            notes: lead.notes,
            projectType: lead.projectType,
            offers: (lead.offers || []).map((offer: any) => ({
                code: offer.code,
                subOffer: offer.subOffer,
                reason: offer.reason,
            })),
            estimatedValue: lead.estimatedValue,
            followUpDate: lead.followUpDate,
            confidence: lead.confidence,
            salesPerson: lead.salesPerson,
            status: lead.status,
            stageHistory: (lead.stageHistory || []).map((entry: any) => ({
                from: entry.from,
                to: entry.to,
                reason: entry.reason,
                actor: entry.actor,
                createdAt: entry.createdAt,
            })),
            createdAt: lead.createdAt,
            updatedAt: lead.updatedAt,
        };
        return result;
    },
    toSearchResponse: (data: { count: number; items: any[] }, ctx: RequestContext) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const lead of data?.items || []) {
            result.items.push(LeadMapper.toResponse(lead, ctx));
        }
        return result;
    },
};
