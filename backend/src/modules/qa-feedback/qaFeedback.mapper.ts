import { RequestContext } from '../../shared/utils/contextBuilder';

export const QaFeedbackMapper = {
    toResponse: (feedback: any, ctx: RequestContext) => {
        const reportedBy = feedback.reportedBy;
        return {
            id: feedback._id?.toString(),
            pageRoute: feedback.pageRoute,
            pageTitle: feedback.pageTitle,
            pinXPercent: feedback.pinXPercent,
            pinYPercent: feedback.pinYPercent,
            comment: feedback.comment,
            issueKey: feedback.issueKey,
            reportedBy:
                reportedBy && typeof reportedBy === 'object'
                    ? { id: reportedBy._id?.toString(), firstName: reportedBy.firstName, lastName: reportedBy.lastName, email: reportedBy.email }
                    : reportedBy,
            status: feedback.status,
            resolutionNote: feedback.resolutionNote,
            createdAt: feedback.createdAt,
            updatedAt: feedback.updatedAt,
        };
    },
    toSearchResponse: (data: any, ctx: RequestContext) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const f of data?.items || []) {
            // NOTE: independent from toResponse on purpose — mirrors it field-for-field for now (incl. same permission gating) so nothing breaks; search rows can be trimmed later without affecting GET /:id.
            const reportedBy = f.reportedBy;
            const item: any = {
                id: f._id?.toString(),
                pageRoute: f.pageRoute,
                pageTitle: f.pageTitle,
                pinXPercent: f.pinXPercent,
                pinYPercent: f.pinYPercent,
                comment: f.comment,
                issueKey: f.issueKey,
                reportedBy:
                    reportedBy && typeof reportedBy === 'object'
                        ? { id: reportedBy._id?.toString(), firstName: reportedBy.firstName, lastName: reportedBy.lastName, email: reportedBy.email }
                        : reportedBy,
                status: f.status,
                resolutionNote: f.resolutionNote,
                createdAt: f.createdAt,
                updatedAt: f.updatedAt,
            };
            result.items.push(item);
        }
        return result;
    },
};
