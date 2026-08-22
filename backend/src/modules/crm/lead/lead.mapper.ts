import { RequestContext } from '../../../shared/utils/contextBuilder';
import { LEAD_PROJECT_TYPES, LEAD_STATUSES } from './lead.constants';

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
    toReportResponse: (report: any) => {
        const statusCounts = new Map<string, number>((report?.statusCounts || []).map((s: any) => [s._id, s.count]));
        const projectTypeCounts = new Map<string, number>(
            (report?.projectTypeCounts || []).map((p: any) => [p._id, p.count]),
        );

        return {
            summary: report?.summary,
            byStatus: Object.values(LEAD_STATUSES).map((status) => ({
                status,
                count: statusCounts.get(status) || 0,
            })),
            byProjectType: Object.values(LEAD_PROJECT_TYPES).map((projectType) => ({
                projectType,
                count: projectTypeCounts.get(projectType) || 0,
            })),
            trends: {
                newLeads: {
                    from: report?.meta?.from,
                    to: report?.meta?.to,
                    data: report?.newLeadsTrend || [],
                },
            },
        };
    },
};
