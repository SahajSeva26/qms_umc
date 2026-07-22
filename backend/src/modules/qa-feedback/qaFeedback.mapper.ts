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
            result.items.push(QaFeedbackMapper.toResponse(f, ctx));
        }
        return result;
    },
};
